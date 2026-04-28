import { supabase } from '../_lib/supabase.js';

export class ComplianceService {
 /**
 * Check all vehicle expiries and suspend non-compliant vehicles
 * Creates alerts for admin notification
 */
 static async checkExpiries(businessId: string) {
 const today = new Date();
 today.setHours(0, 0, 0, 0);

 // Get all active vehicles (AVAILABLE or RENTED) for this business
 const { data: vehicles, error: vError } = await supabase
 .from('vehicles')
 .select('*')
 .eq('business_id', businessId)
 .in('status', ['AVAILABLE', 'RENTED']);

 if (vError) throw vError;

        const results: any[] = [];

        for (const vehicle of vehicles || []) {
            const issues: { type: string; message: string }[] = [];

            // Check rego expiry
            const regoExpiry = new Date(vehicle.rego_expiry);
            if (regoExpiry < today) {
                issues.push({
                    type: 'REGO_EXPIRY',
                    message: `Registration expired on ${new Date(vehicle.rego_expiry).toLocaleDateString()}`
                });
            }

            // Check CTP expiry
            const ctpExpiry = new Date(vehicle.ctp_expiry);
            if (ctpExpiry < today) {
                issues.push({
                    type: 'CTP_EXPIRY',
                    message: `CTP (Green Slip) expired on ${new Date(vehicle.ctp_expiry).toLocaleDateString()}`
                });
            }

            // Check Pink Slip expiry
            const pinkSlipExpiry = new Date(vehicle.pink_slip_expiry);
            if (pinkSlipExpiry < today) {
                issues.push({
                    type: 'PINK_SLIP_EXPIRY',
                    message: `Pink Slip (Safety Check) expired on ${new Date(vehicle.pink_slip_expiry).toLocaleDateString()}`
                });
            }

            if (issues.length > 0) {
                // Suspend vehicle
                await supabase
                    .from('vehicles')
                    .update({ status: 'SUSPENDED' })
                    .eq('id', vehicle.id);

                // Create alerts for each issue
                for (const issue of issues) {
                    // Check if alert already exists
                    const { data: existingAlert } = await supabase
                        .from('alerts')
                        .select('id')
                        .eq('vehicle_id', vehicle.id)
                        .eq('type', issue.type)
                        .eq('resolved', false)
                        .single();

if (!existingAlert) {
 await supabase
 .from('alerts')
 .insert({
 type: issue.type,
 message: `${vehicle.plate}: ${issue.message}`,
 vehicle_id: vehicle.id,
 business_id: businessId
 });
 }
                }

                results.push({
                    vehicleId: vehicle.id,
                    plate: vehicle.plate,
                    issues: issues.map(i => i.type),
                    status: 'suspended'
                });
            }
        }

        return {
            checkedCount: vehicles?.length || 0,
            suspendedCount: results.length,
            details: results
        };
    }

/**
 * Get all unresolved alerts
 */
 static async getUnresolvedAlerts(businessId: string) {
 const { data, error } = await supabase
 .from('alerts')
 .select('*, vehicle:vehicles(plate)')
 .eq('business_id', businessId)
 .eq('resolved', false)
 .order('created_at', { ascending: false });

 if (error) throw error;
 return data;
 }

/**
 * Resolve an alert
 */
 static async resolveAlert(alertId: string, businessId: string) {
 const { data, error } = await supabase
 .from('alerts')
 .update({
 resolved: true,
 resolved_at: new Date().toISOString()
 })
 .eq('id', alertId)
 .eq('business_id', businessId)
 .select()
 .single();

 if (error) throw error;
 return data;
 }

/**
 * Get upcoming expiries (within 30 days)
 */
 static async getUpcomingExpiries(businessId: string) {
 const today = new Date();
 const thirtyDaysFromNow = new Date();
 thirtyDaysFromNow.setDate(today.getDate() + 30);

 const { data: vehicles, error } = await supabase
 .from('vehicles')
 .select('*')
 .eq('business_id', businessId)
 .neq('status', 'SUSPENDED')
 .or(`rego_expiry.lte.${thirtyDaysFromNow.toISOString()},ctp_expiry.lte.${thirtyDaysFromNow.toISOString()},pink_slip_expiry.lte.${thirtyDaysFromNow.toISOString()}`);

 if (error) throw error;

        return (vehicles || []).map(v => {
            const expiries: string[] = [];
            if (new Date(v.rego_expiry) <= thirtyDaysFromNow) {
                expiries.push(`Rego: ${new Date(v.rego_expiry).toLocaleDateString()}`);
            }
            if (new Date(v.ctp_expiry) <= thirtyDaysFromNow) {
                expiries.push(`CTP: ${new Date(v.ctp_expiry).toLocaleDateString()}`);
            }
            if (new Date(v.pink_slip_expiry) <= thirtyDaysFromNow) {
                expiries.push(`Pink Slip: ${new Date(v.pink_slip_expiry).toLocaleDateString()}`);
            }
            return {
                vehicleId: v.id,
                plate: v.plate,
                upcomingExpiries: expiries
            };
        });
    }
}
