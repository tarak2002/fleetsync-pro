import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { adminOnly, AuthRequest } from '../_middleware/auth.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ============ BUSINESS CRUD ============

// Get all businesses
router.get('/', adminOnly, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get business by ID
router.get('/:id', adminOnly, async (req, res) => {
    try {
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

// Create a business
router.post('/', adminOnly, async (req, res) => {
    try {
        const { name, abn, address, phone, email } = req.body;
        const { data, error } = await supabase
            .from('businesses')
            .insert({
                id: uuidv4(),
                name: name || 'Untitled Business',
                abn: abn || null,
                address: address || null,
                phone: phone || null,
                email: email || null,
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

// Update a business
router.patch('/:id', adminOnly, async (req, res) => {
    try {
        const { name, abn, address, phone, email, is_active } = req.body;
        const { data, error } = await supabase
            .from('businesses')
            .update({
                ...(name !== undefined && { name }),
                ...(abn !== undefined && { abn }),
                ...(address !== undefined && { address }),
                ...(phone !== undefined && { phone }),
                ...(email !== undefined && { email }),
                ...(is_active !== undefined && { is_active }),
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

// Delete a business
router.delete('/:id', adminOnly, async (req, res) => {
    try {
        const { error } = await supabase
            .from('businesses')
            .delete()
            .eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============ VEHICLE DOCUMENTS PER BUSINESS ============

// Get all documents for a vehicle
router.get('/vehicle-docs/:vehicleId', adminOnly, async (req, res) => {
    try {
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

// Upload a document for a vehicle
router.post('/vehicle-docs/:vehicleId/upload', adminOnly, upload.single('file'), async (req: AuthRequest, res) => {
    try {
        const { vehicleId } = req.params;
        const { name, doc_type, expiry_date, notes } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: 'No file provided' });
        if (!name) return res.status(400).json({ error: 'Document name is required' });

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

        // Get the public/signed URL (private bucket, so we store the path and generate signed URLs on demand)
        const docId = uuidv4();
        const { data, error: dbError } = await supabase
            .from('vehicle_documents')
            .insert({
                id: docId,
                vehicle_id: vehicleId,
                name,
                doc_type: doc_type || 'OTHER',
                file_url: filePath, // Store the storage path
                file_name: file.originalname,
                file_size: file.size,
                mime_type: file.mimetype,
                expiry_date: expiry_date || null,
                notes: notes || null,
                uploaded_by: req.user?.id || null,
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

// Delete a vehicle document
router.delete('/vehicle-docs/:vehicleId/:docId', adminOnly, async (req, res) => {
    try {
        const { vehicleId, docId } = req.params;

        // Get doc to find storage path
        const { data: doc, error: fetchErr } = await supabase
            .from('vehicle_documents')
            .select('file_url')
            .eq('id', docId)
            .eq('vehicle_id', vehicleId)
            .single();

        if (fetchErr || !doc) return res.status(404).json({ error: 'Document not found' });

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

// Get signed download URL for a doc
router.get('/vehicle-docs/:vehicleId/:docId/download', async (req: AuthRequest, res) => {
    try {
        const { vehicleId, docId } = req.params;

        const { data: doc, error } = await supabase
            .from('vehicle_documents')
            .select('*')
            .eq('id', docId)
            .eq('vehicle_id', vehicleId)
            .single();

        if (error || !doc) return res.status(404).json({ error: 'Document not found' });

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
