import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { adminOnly, AuthRequest } from '../_middleware/auth.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ============ BUSINESS CRUD ============

// Get all businesses the user has access to (wrapped in array for UI compatibility)
router.get('/', adminOnly, async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.json([]);

        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId);

        if (error) throw error;
        res.json(data || []);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get current business details
router.get('/my-business', adminOnly, async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(404).json({ error: 'No business linked to this account' });

        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();

        if (error || !data) return res.status(404).json({ error: 'Business not found' });
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get business by ID (Strictly limited to own business unless super-admin)
router.get('/:id', adminOnly, async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (businessId && businessId !== req.params.id) {
            return res.status(403).json({ error: 'Access denied to this business' });
        }

        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', req.params.id)
            .single();
        if (error || !data) return res.status(404).json({ error: 'Business not found' });
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update business by ID
router.patch('/:id', adminOnly, async (req: AuthRequest, res) => {
    try {
        const { name, abn, address, phone, email, is_active, bank_name, bank_bsb, bank_account_number, bank_account_name, admin_user_id, admin_name } = req.body;

        const { data, error } = await supabase
            .from('businesses')
            .update({
                ...(name !== undefined && { name }),
                ...(abn !== undefined && { abn }),
                ...(address !== undefined && { address }),
                ...(phone !== undefined && { phone }),
                ...(email !== undefined && { email }),
                ...(is_active !== undefined && { is_active }),
                ...(bank_name !== undefined && { bank_name }),
                ...(bank_bsb !== undefined && { bank_bsb }),
                ...(bank_account_number !== undefined && { bank_account_number }),
                ...(bank_account_name !== undefined && { bank_account_name }),
                ...(admin_user_id !== undefined && { admin_user_id }),
                ...(admin_name !== undefined && { admin_name }),
                updated_at: new Date().toISOString(),
            })
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update current business
router.patch('/my-business', adminOnly, async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: 'No business linked to this account' });

        const { name, abn, address, phone, email, is_active, bank_name, bank_bsb, bank_account_number, bank_account_name } = req.body;
        const { data, error } = await supabase
            .from('businesses')
            .update({
                ...(name !== undefined && { name }),
                ...(abn !== undefined && { abn }),
                ...(address !== undefined && { address }),
                ...(phone !== undefined && { phone }),
                ...(email !== undefined && { email }),
                ...(is_active !== undefined && { is_active }),
                ...(bank_name !== undefined && { bank_name }),
                ...(bank_bsb !== undefined && { bank_bsb }),
                ...(bank_account_number !== undefined && { bank_account_number }),
                ...(bank_account_name !== undefined && { bank_account_name }),
                updated_at: new Date().toISOString(),
            })
            .eq('id', businessId)
            .select()
            .single();
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ VEHICLE DOCUMENTS PER BUSINESS ============

// Get all documents for a vehicle (Verified Ownership)
router.get('/vehicle-docs/:vehicleId', adminOnly, async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

        // 1. Verify vehicle belongs to business
        const { data: vehicle, error: vError } = await supabase
            .from('vehicles')
            .select('id')
            .eq('id', req.params.vehicleId)
            .eq('business_id', businessId)
            .single();

        if (vError || !vehicle) return res.status(403).json({ error: 'Access denied to this vehicle' });

        const { data, error } = await supabase
            .from('vehicle_documents')
            .select('*')
            .eq('vehicle_id', req.params.vehicleId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Upload a document for a vehicle (Verified Ownership)
router.post('/vehicle-docs/:vehicleId/upload', adminOnly, upload.single('file'), async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

        const { vehicleId } = req.params;
        const { name, doc_type, expiry_date, notes } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'No file provided' });
        if (!name) return res.status(400).json({ error: 'Document name is required' });

        // 1. Verify vehicle belongs to business
        const { data: vehicle, error: vError } = await supabase
            .from('vehicles')
            .select('id')
            .eq('id', vehicleId)
            .eq('business_id', businessId)
            .single();

        if (vError || !vehicle) return res.status(403).json({ error: 'Access denied to this vehicle' });

        const fileExt = file.originalname.split('.').pop();
        const filePath = `${vehicleId}/${uuidv4()}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: storageError } = await supabase.storage
            .from('vehicle-documents')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (storageError) throw storageError;

        const docId = uuidv4();
        const { data, error: dbError } = await supabase
            .from('vehicle_documents')
            .insert({
                id: docId,
                vehicle_id: vehicleId,
                name,
                doc_type: doc_type || 'OTHER',
                file_url: filePath,
                file_name: file.originalname,
                file_size: file.size,
                mime_type: file.mimetype,
                expiry_date: expiry_date || null,
                notes: notes || null,
                uploaded_by: req.user?.id || null,
                business_id: businessId, // Ensure doc is linked to business
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (dbError) throw dbError;
        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a vehicle document (Verified Ownership)
router.delete('/vehicle-docs/:vehicleId/:docId', adminOnly, async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

        const { vehicleId, docId } = req.params;

        // Verify document belongs to business
        const { data: doc, error: fetchErr } = await supabase
            .from('vehicle_documents')
            .select('file_url')
            .eq('id', docId)
            .eq('vehicle_id', vehicleId)
            .eq('business_id', businessId)
            .single();

        if (fetchErr || !doc) return res.status(404).json({ error: 'Document not found or access denied' });

        // Delete from storage
        if (doc.file_url) {
            await supabase.storage.from('vehicle-documents').remove([doc.file_url]);
        }

        // Delete from DB
        const { error } = await supabase
            .from('vehicle_documents')
            .delete()
            .eq('id', docId);
        if (error) throw error;

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get signed download URL for a doc (Verified Ownership)
router.get('/vehicle-docs/:vehicleId/:docId/download', adminOnly, async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

        const { vehicleId, docId } = req.params;

        const { data: doc, error } = await supabase
            .from('vehicle_documents')
            .select('*')
            .eq('id', docId)
            .eq('vehicle_id', vehicleId)
            .eq('business_id', businessId)
            .single();

        if (error || !doc) return res.status(404).json({ error: 'Document not found or access denied' });

        const { data: signedData, error: signErr } = await supabase.storage
            .from('vehicle-documents')
            .createSignedUrl(doc.file_url, 3600); // 1 hr expiry

        if (signErr) throw signErr;

        res.json({ url: signedData.signedUrl, doc });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
