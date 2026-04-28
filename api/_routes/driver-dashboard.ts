import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest, authMiddleware } from '../_middleware/auth.js';

const router = Router();

// SEC-25 FIX: Removed debug-user endpoint

// Driver dashboard data
router.get('/active-rental', authMiddleware, async (req: AuthRequest, res) => {
 try {
 if (!req.user || req.user.role !== 'DRIVER') {
 return res.status(403).json({ error: 'Driver access required' });
 }

 const businessId = req.user.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 let driverId = req.user.driverId;

 // Fallback: If driverId is missing from middleware, try to find it again
 if (!driverId && req.user.id) {
 console.log(`[Dashboard] DriverId missing in middleware for user ${req.user.id}. Performing fallback lookup...`);
 const { data: driverData } = await supabase
 .from('drivers')
 .select('id')
 .eq('user_id', req.user.id)
 .eq('business_id', businessId)
 .maybeSingle();

 if (driverData) {
 driverId = driverData.id;
 console.log(`[Dashboard] Fallback lookup successful: ${driverId}`);
 }
 }

 if (!driverId) {
 console.warn(`[Dashboard] No driverId found for user ${req.user.id}`);
 return res.status(200).json({ has_active_rental: false });
 }

 console.log(`[Dashboard] Fetching active rental for driver: ${driverId}`);
 const { data: activeRental, error } = await supabase
 .from('rentals')
 .select('*, vehicle:vehicles(*)')
 .eq('driver_id', driverId)
 .eq('business_id', businessId)
 .in('status', ['ACTIVE', 'PENDING'])
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle();

        if (error) {
            console.error('[Dashboard] Rental lookup error:', error);
            throw error;
        }

        if (!activeRental) {
            return res.json({ 
                has_active_rental: false, 
                driver_status: req.user.driverStatus || 'ACTIVE' 
            });
        }

        // Handle case where vehicle join might return an array or object
        let vehicle: any = null;
        if (activeRental.vehicle) {
            if (Array.isArray(activeRental.vehicle)) {
                vehicle = activeRental.vehicle[0];
            } else if (typeof activeRental.vehicle === 'object') {
                vehicle = activeRental.vehicle;
            }
        }

        if (!vehicle) {
            console.error('[Dashboard] Vehicle data missing in active rental:', activeRental.id);
            return res.json({ has_active_rental: false, error: 'Vehicle data missing' });
        }

        // Fetch all vehicle documents from DB
        const { data: vehicleDocs } = await supabase
            .from('vehicle_documents')
            .select('id, name, doc_type, file_name, file_url, expiry_date')
            .eq('vehicle_id', vehicle.id)
            .order('created_at', { ascending: false });

        // Get shift status
        const { data: shift } = await supabase
            .from('shifts')
            .select('id, status, started_at, ended_at')
            .eq('rental_id', activeRental.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        res.json({
            has_active_rental: true,
            rental_id: activeRental.id,
            vehicle: vehicle,
            vehicle_documents: vehicleDocs || [],
            driver_status: req.user.driverStatus || 'ACTIVE',
            documents: {
                regoUrl: `/api/documents/rego/${vehicle.id}`,
                ctpUrl: `/api/documents/ctp/${vehicle.id}`,
                pinkSlipUrl: `/api/documents/pink-slip/${vehicle.id}`,
                rentalAgreementUrl: `/api/documents/rental-agreement/${activeRental.id}`
            },
            shift_id: shift?.id || null,
            shift_status: shift?.status || 'NOT_STARTED',
            started_at: shift?.started_at || null,
            last_condition_report: shift?.started_at || null,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Start shift
router.post('/start-shift', authMiddleware, async (req: AuthRequest, res) => {
 try {
 if (!req.user || req.user.role !== 'DRIVER') {
 return res.status(403).json({ error: 'Driver access required' });
 }

 const businessId = req.user.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { rental_id, vehicle_id, driver_id, damage_markers, notes, photos } = req.body;
 const shift_id = crypto.randomUUID();

 // 1. Create the new shift record
 const { data: newShift, error: shiftError } = await supabase
 .from('shifts')
 .insert({
 id: shift_id,
 rental_id,
 driver_id,
 business_id: businessId,
 status: 'ACTIVE',
 started_at: new Date().toISOString(),
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString()
 })
 .select()
 .single();

 if (shiftError) throw shiftError;

 // 2. Create the condition report linked to this shift
 const { data: conditionReport, error: crError } = await supabase
 .from('condition_reports')
 .insert({
 id: crypto.randomUUID(),
 shift_id,
 vehicle_id,
 driver_id,
 business_id: businessId,
 damage_markers: JSON.stringify(damage_markers || []),
 notes: notes || null,
 photos: photos || [],
 verified_at: new Date().toISOString(),
 created_at: new Date().toISOString(),
 })
 .select()
 .single();

 if (crError) throw crError;

 res.json({ shift: newShift, conditionReport });
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// End shift
router.post('/end-shift', authMiddleware, async (req: AuthRequest, res) => {
 try {
 if (!req.user || req.user.role !== 'DRIVER') {
 return res.status(403).json({ error: 'Driver access required' });
 }

 const businessId = req.user.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { shift_id } = req.body;

 // Verify shift belongs to this business
 const { data: shift } = await supabase
 .from('shifts')
 .select('id, business_id')
 .eq('id', shift_id)
 .single();

 if (!shift || shift.business_id !== businessId) {
 return res.status(404).json({ error: 'Shift not found' });
 }

 const { data, error } = await supabase
 .from('shifts')
 .update({ status: 'ENDED', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
 .eq('id', shift_id)
 .eq('business_id', businessId)
 .select()
 .single();
 if (error) throw error;
 res.json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Return vehicle
// SEC-14 FIX: Add ownership check — only the driver who owns the rental can return it
router.post('/return-vehicle', authMiddleware, async (req: AuthRequest, res) => {
 try {
 if (!req.user || req.user.role !== 'DRIVER') {
 return res.status(403).json({ error: 'Driver access required' });
 }

 const businessId = req.user.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { rental_id, shift_id } = req.body;

 // Verify the driver owns this rental
 const { data: rental, error: rentalErr } = await supabase
 .from('rentals')
 .select('id, driver_id, vehicle_id')
 .eq('id', rental_id)
 .eq('business_id', businessId)
 .single();

 if (rentalErr || !rental) return res.status(404).json({ error: 'Rental not found' });
 if (req.user?.role !== 'ADMIN' && rental.driver_id !== req.user?.driverId) {
 return res.status(403).json({ error: 'Access denied' });
 }

 if (shift_id) {
 await supabase
 .from('shifts')
 .update({ status: 'ENDED', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
 .eq('id', shift_id)
 .eq('business_id', businessId);
 }

 const { data, error } = await supabase
 .from('rentals')
 .update({ status: 'COMPLETED', end_date: new Date().toISOString(), updated_at: new Date().toISOString() })
 .eq('id', rental_id)
 .eq('business_id', businessId)
 .select()
 .single();

 if (error) throw error;

 // Update vehicle status back to available
 await supabase
 .from('vehicles')
 .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
 .eq('id', data.vehicle_id)
 .eq('business_id', businessId);

 res.json({ success: true, rental: data });
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Get shift history
router.get('/shifts', authMiddleware, async (req: AuthRequest, res) => {
 try {
 if (!req.user || req.user.role !== 'DRIVER') {
 return res.status(403).json({ error: 'Driver access required' });
 }

 const businessId = req.user.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 let driverId = (req.query.driver_id as string) || req.user?.driverId;

 // If driverId is still effectively empty, try to find it via user_id
 if ((!driverId || driverId === 'undefined' || driverId === 'null') && req.user?.id) {
 const { data: driverData } = await supabase
 .from('drivers')
 .select('id')
 .eq('user_id', req.user.id)
 .eq('business_id', businessId)
 .maybeSingle();

 if (driverData) {
 driverId = driverData.id;
 }
 }

 if (!driverId) return res.json([]);

 console.log(`[Dashboard] Fetching shift history for driver: ${driverId}`);
 const { data, error } = await supabase
 .from('shifts')
 .select(`
 *,
 rental:rentals(
 vehicle:vehicles(*)
 )
 `)
 .eq('driver_id', driverId)
 .eq('business_id', businessId)
 .order('created_at', { ascending: false });

 if (error) throw error;
 res.json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Accident report
router.post('/accident-report', authMiddleware, async (req: AuthRequest, res) => {
 try {
 if (!req.user || req.user.role !== 'DRIVER') {
 return res.status(403).json({ error: 'Driver access required' });
 }

 const businessId = req.user.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const {
 rental_id, driver_id, vehicle_id,
 isSafe, emergencyCalled, description,
 thirdPartyName, thirdPartyPhone, thirdPartyPlate,
 location, scene_photos, occurred_at
 } = req.body;

 const { data, error } = await supabase
 .from('accident_reports')
 .insert({
 id: crypto.randomUUID(),
 rental_id,
 driver_id,
 vehicle_id,
 business_id: businessId,
 is_safe: isSafe ?? true,
 emergency_called: emergencyCalled ?? false,
 description: description || null,
 third_party_name: thirdPartyName || null,
 third_party_phone: thirdPartyPhone || null,
 third_party_plate: thirdPartyPlate || null,
 scene_photos: scene_photos || [],
 location: location || null,
 occurred_at,
 synced_at: new Date().toISOString(),
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .select()
 .single();

 if (error) throw error;
 res.status(201).json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

export default router;
