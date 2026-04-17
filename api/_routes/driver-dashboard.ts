import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest } from '../_middleware/auth.js';

const router = Router();

// Debug user session
router.get('/debug-user', async (req: AuthRequest, res) => {
    res.json({ user: req.user });
});

// Driver dashboard data
router.get('/active-rental', async (req: AuthRequest, res) => {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ error: 'Driver access required' });
        }

        let driverId = req.user.driverId;
        
        // Fallback: If driverId is missing from middleware, try to find it again
        if (!driverId && req.user.id) {
            console.log(`[Dashboard] DriverId missing in middleware for user ${req.user.id}. Performing fallback lookup...`);
            const { data: driverData } = await supabase
                .from('drivers')
                .select('id')
                .eq('user_id', req.user.id)
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
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[Dashboard] Rental lookup error:', error);
            throw error;
        }

        if (!activeRental) {
            return res.json({ has_active_rental: false });
        }

        // Handle case where vehicle join might return an array or object
        const vehicle = Array.isArray(activeRental.vehicle) ? activeRental.vehicle[0] : activeRental.vehicle;

        if (!vehicle) {
            console.error('[Dashboard] Vehicle data missing in active rental:', activeRental.id);
            return res.json({ has_active_rental: false, error: 'Vehicle data missing' });
        }

        // Fetch all vehicle documents from DB
        const { data: vehicleDocs } = await supabase
            .from('vehicle_documents')
            .select('id, name, doc_type, file_name, expiry_date')
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
router.post('/start-shift', async (req: AuthRequest, res) => {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ error: 'Driver access required' });
        }

        const { shift_id, vehicle_id, driver_id, damage_markers, notes, photos } = req.body;

        const { data: conditionReport, error: crError } = await supabase
            .from('condition_reports')
            .insert({
                id: crypto.randomUUID(),
                shift_id,
                vehicle_id,
                driver_id,
                damage_markers: JSON.stringify(damage_markers || []),
                notes: notes || null,
                photos: photos || [],
                verified_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (crError) throw crError;

        const { data: updatedShift, error: shiftError } = await supabase
            .from('shifts')
            .update({ status: 'ACTIVE', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', shift_id)
            .select()
            .single();

        if (shiftError) throw shiftError;

        res.json({ shift: updatedShift, conditionReport });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// End shift
router.post('/end-shift', async (req: AuthRequest, res) => {
    try {
        const { shift_id } = req.body;
        const { data, error } = await supabase
            .from('shifts')
            .update({ status: 'ENDED', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', shift_id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Return vehicle
router.post('/return-vehicle', async (req: AuthRequest, res) => {
    try {
        const { rental_id, shift_id } = req.body;

        if (shift_id) {
            await supabase
                .from('shifts')
                .update({ status: 'ENDED', ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq('id', shift_id);
        }

        const { data, error } = await supabase
            .from('rentals')
            .update({ status: 'COMPLETED', end_date: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', rental_id)
            .select()
            .single();

        if (error) throw error;

        // Update vehicle status back to available
        await supabase
            .from('vehicles')
            .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
            .eq('id', data.vehicle_id);

        res.json({ success: true, rental: data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Accident report
router.post('/accident-report', async (req: AuthRequest, res) => {
    try {
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
