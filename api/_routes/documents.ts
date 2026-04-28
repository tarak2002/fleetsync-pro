import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest, authMiddleware } from '../_middleware/auth.js';

const router = Router();

// Dynamic document endpoint — serves vehicle docs from DB + legacy static docs
router.get('/:type/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

        const { type, id } = req.params;

        if (['rego', 'ctp', 'pink-slip'].includes(type)) {
            const { data: vehicle, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('id', id)
                .eq('business_id', businessId)
                .single();

            if (error || !vehicle) return res.status(404).json({ error: 'Vehicle not found' });

            // Check if there's an uploaded doc for this type in vehicle_documents
            const docTypeMap: Record<string, string> = {
                'rego': 'REGO',
                'ctp': 'CTP',
                'pink-slip': 'PINK_SLIP',
            };

            console.log(`[Docs] Fetching ${type} for vehicle ${id}`);
            const { data: uploadedDocs, error: docError } = await supabase
                .from('vehicle_documents')
                .select('*')
                .eq('vehicle_id', id)
                .eq('doc_type', docTypeMap[type])
                .order('created_at', { ascending: false })
                .limit(1);

            if (docError) console.error('[Docs] DB Error:', docError);

            const latestUpload = uploadedDocs?.[0];
            console.log(`[Docs] Found upload:`, latestUpload?.name || 'None');
            
            let downloadUrl: string | null = null;

            if (latestUpload?.file_url) {
                console.log(`[Docs] Generating signed URL for:`, latestUpload.file_url);
                const { data: signedData, error: signedError } = await supabase.storage
                    .from('vehicle-documents')
                    .createSignedUrl(latestUpload.file_url, 3600);
                
                if (signedError) console.error('[Docs] Signed URL Error:', signedError);
                console.log(`[Docs] Signed URL result:`, signedData?.signedUrl ? 'SUCCESS' : 'FAILED');
                
                downloadUrl = signedData?.signedUrl || null;
            }

            const docMap: Record<string, any> = {
                'rego': {
                    title: 'Registration Certificate',
                    type: 'REGO',
                    validUntil: vehicle.rego_expiry,
                    details: {
                        'Plate': vehicle.plate,
                        'VIN': vehicle.vin,
                        'Make / Model': `${vehicle.make} ${vehicle.model}`,
                        'Year': vehicle.year,
                        'Owner': 'FleetSync Pro Pty Ltd',
                    },
                    downloadUrl,
                    hasUploadedFile: !!latestUpload,
                },
                'ctp': {
                    title: 'Compulsory Third Party (CTP)',
                    type: 'CTP',
                    validUntil: vehicle.ctp_expiry,
                    details: {
                        'Plate': vehicle.plate,
                        'Insurer': 'NRMA Insurance',
                        'Status': 'ACTIVE',
                    },
                    downloadUrl,
                    hasUploadedFile: !!latestUpload,
                },
                'pink-slip': {
                    title: 'Safety Inspection (Pink Slip)',
                    type: 'PINK_SLIP',
                    inspectionDate: vehicle.pink_slip_expiry,
                    details: {
                        'Plate': vehicle.plate,
                        'VIN': vehicle.vin,
                        'Result': 'PASS',
                        'Inspector': 'Authorised RMS Station',
                    },
                    downloadUrl,
                    hasUploadedFile: !!latestUpload,
                },
            };

            return res.json(docMap[type]);
        }

        if (type === 'rental-agreement') {
            const { data: rental, error } = await supabase
                .from('rentals')
                .select('*, driver:drivers(*), vehicle:vehicles(*)')
                .eq('id', id)
                .eq('business_id', businessId)
                .single();

            if (error || !rental) return res.status(404).json({ error: 'Rental not found' });

            console.log(`[Docs] Fetching rental agreement for rental ${id}`);
            // Check for uploaded rental agreement doc
            const { data: uploadedDocs, error: docError } = await supabase
                .from('vehicle_documents')
                .select('*')
                .eq('vehicle_id', rental.vehicle_id)
                .eq('doc_type', 'RENTAL_AGREEMENT')
                .order('created_at', { ascending: false })
                .limit(1);

            if (docError) console.error('[Docs] Rental Doc DB Error:', docError);
            
            const latestUpload = uploadedDocs?.[0];
            console.log(`[Docs] Found rental upload:`, latestUpload?.name || 'None');

            let downloadUrl: string | null = null;

            if (latestUpload?.file_url) {
                console.log(`[Docs] Generating rental signed URL for:`, latestUpload.file_url);
                const { data: signedData, error: signedError } = await supabase.storage
                    .from('vehicle-documents')
                    .createSignedUrl(latestUpload.file_url, 3600);
                
                if (signedError) console.error('[Docs] Rental Signed URL Error:', signedError);
                console.log(`[Docs] Rental Signed URL result:`, signedData?.signedUrl ? 'SUCCESS' : 'FAILED');
                
                downloadUrl = signedData?.signedUrl || null;
            }

            return res.json({
                title: 'Rental Agreement',
                type: 'RENTAL_AGREEMENT',
                startDate: rental.start_date,
                details: {
                    'Driver': rental.driver.name,
                    'Vehicle': `${rental.vehicle.make} ${rental.vehicle.model}`,
                    'Plate': rental.vehicle.plate,
                    'Weekly Rate': `$${Number(rental.weekly_rate).toFixed(2)}`,
                    'Bond': `$${Number(rental.bond_amount).toFixed(2)}`,
                },
                terms: [
                    'Vehicle must be returned in the same condition',
                    'Cleanliness required at all times',
                    'Weekly payments due every Monday',
                    'No smoking or pets in the vehicle',
                    'Any fines are the responsibility of the driver',
                ],
                downloadUrl,
                hasUploadedFile: !!latestUpload,
            });
        }

        // Generic doc type from vehicle_documents table by document ID
        if (type === 'vehicle-doc') {
            console.log(`[Docs] Fetching generic doc ${id}`);
            // First get the doc to find vehicle_id
            const { data: doc, error } = await supabase
                .from('vehicle_documents')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !doc) return res.status(404).json({ error: 'Document not found' });

            // Verify vehicle belongs to business
            const { data: vehicle } = await supabase
                .from('vehicles')
                .select('id')
                .eq('id', doc.vehicle_id)
                .eq('business_id', businessId)
                .single();

            if (!vehicle) return res.status(404).json({ error: 'Document not found' });

            let downloadUrl: string | null = null;
            if (doc.file_url) {
                console.log(`[Docs] Generating generic signed URL for:`, doc.file_url);
                const { data: signedData, error: signedError } = await supabase.storage
                    .from('vehicle-documents')
                    .createSignedUrl(doc.file_url, 3600);
                
                if (signedError) console.error('[Docs] Generic Signed URL Error:', signedError);
                console.log(`[Docs] Generic Signed URL result:`, signedData?.signedUrl ? 'SUCCESS' : 'FAILED');
                
                downloadUrl = signedData?.signedUrl || null;
            }

            return res.json({
                title: doc.name,
                type: doc.doc_type,
                expiryDate: doc.expiry_date,
                details: {
                    'Document Type': doc.doc_type.replace('_', ' '),
                    'File Name': doc.file_name || 'N/A',
                    'File Size': doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'N/A',
                    ...(doc.notes ? { 'Notes': doc.notes } : {}),
                },
                downloadUrl,
                hasUploadedFile: true,
            });
        }

        res.status(400).json({ error: 'Invalid document type' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
// Get all documents for a vehicle (for glove box listing)
router.get('/list/:vehicleId', authMiddleware, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { vehicleId } = req.params;

 // Verify vehicle belongs to business
 const { data: vehicle } = await supabase
 .from('vehicles')
 .select('id')
 .eq('id', vehicleId)
 .eq('business_id', businessId)
 .single();

 if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

 const { data, error } = await supabase
 .from('vehicle_documents')
 .select('id, name, doc_type, file_name, file_size, expiry_date, created_at')
 .eq('vehicle_id', vehicleId)
 .order('created_at', { ascending: false });

 if (error) throw error;
 res.json(data || []);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

export default router;
