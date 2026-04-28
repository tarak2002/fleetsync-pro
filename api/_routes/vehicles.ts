import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest, adminOnly, authMiddleware } from '../_middleware/auth.js';
import { validationResult } from 'express-validator';
import { createVehicleValidation } from '../_validators/createVehicle.js';

const router = Router();

// Validation middleware
const validate = (req: AuthRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const getComplianceColor = (expiryDate: string): 'GREEN' | 'AMBER' | 'RED' => {
  const months = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
  if (months < 0) return 'RED';
  if (months < 2) return 'AMBER';
  return 'GREEN';
};

// Get all vehicles with optional status filter
router.get('/', adminOnly, async (req: AuthRequest, res) => {
 try {
 const { status } = req.query;
 const businessId = req.user?.businessId;

 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 let query = supabase
 .from('vehicles')
 .select('*, rentals(*, driver:drivers(*))')
 .eq('business_id', businessId);

 if (status) query = query.eq('status', status as string);

 const { data: vehicles, error } = await query;
    if (error) throw error;

    const formatted = (vehicles || []).map(v => ({
      ...v,
      compliance: {
        rego: getComplianceColor(v.rego_expiry),
        ctp: getComplianceColor(v.ctp_expiry),
        pink_slip: getComplianceColor(v.pink_slip_expiry),
      },
      current_driver: v.rentals?.find((r: any) => r.status === 'ACTIVE')?.driver || null,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available vehicles
router.get('/available', authMiddleware, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data, error } = await supabase
 .from('vehicles')
 .select('*')
 .eq('business_id', businessId)
 .eq('status', 'AVAILABLE');
 if (error) throw error;
 res.json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Get vehicle by ID
router.get('/:id', async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data: vehicle, error } = await supabase
 .from('vehicles')
 .select('*, rentals(*, driver:drivers(*))')
 .eq('id', req.params.id)
 .eq('business_id', businessId)
 .order('created_at', { ascending: false, referencedTable: 'rentals' })
 .single();

 if (error || !vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const formatted = {
      ...vehicle,
      compliance: {
        rego: getComplianceColor(vehicle.rego_expiry),
        ctp: getComplianceColor(vehicle.ctp_expiry),
        pink_slip: getComplianceColor(vehicle.pink_slip_expiry),
      },
      current_driver: vehicle.rentals?.find((r: any) => r.status === 'ACTIVE')?.driver || null,
    };

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create vehicle - with validation
router.post('/', adminOnly, createVehicleValidation, validate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

    const { vin, plate, make, model, year, color, weekly_rate, bond_amount, rego_expiry, ctp_expiry, pink_slip_expiry } = req.body;
    
    if (!vin || !plate || !make || !model || !year) {
      return res.status(400).json({ error: 'VIN, plate, make, model, and year are required' });
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert({ 
        vin, 
        plate, 
        make, 
        model, 
        year, 
        color, 
        weekly_rate, 
        bond_amount, 
        rego_expiry, 
        ctp_expiry, 
        pink_slip_expiry,
        status: 'AVAILABLE', 
        business_id: businessId, 
        updated_at: new Date().toISOString() 
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update vehicle
router.patch('/:id', adminOnly, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

    const allowedFields = ['vin', 'plate', 'make', 'model', 'year', 'color', 'weekly_rate', 'bond_amount', 'rego_expiry', 'ctp_expiry', 'pink_slip_expiry', 'status'];
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', req.params.id)
      .eq('business_id', businessId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
