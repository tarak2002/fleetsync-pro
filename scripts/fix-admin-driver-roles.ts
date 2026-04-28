/**
 * Migration Script: Fix ADMIN/DRIVER Role Differentiation
 *
 * This script:
 * 1. Finds users created as DRIVER who should be ADMIN (have no business_id, no drivers entry)
 * 2. Updates them to ADMIN role
 * 3. Logs the changes
 *
 * Run with: npx tsx scripts/fix-admin-driver-roles.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ldyvkgyapjxyhjwsxanc.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkeXZrZ3lhcGp4eWhqd3N4YW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIwNTM4OCwiZXhwIjoyMDkyNzgxMzg4fQ.iSLNYoeY8-eUpXrI_LkNhyaiIdzcS6PLqkACvdm25c4';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixAdminRoles() {
  console.log('🔧 Starting ADMIN/DRIVER role fix...\n');

  try {
    // Find all users with DRIVER role who have a business_id
    // These are likely incorrectly assigned ADMINs
    const { data: wronglyAssignedAdmins, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role, business_id')
      .eq('role', 'DRIVER')
      .not('business_id', 'is', null);

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError);
      return;
    }

    if (!wronglyAssignedAdmins || wronglyAssignedAdmins.length === 0) {
      console.log('✅ No DRIVER users with business_id found (all correct!)');
      return;
    }

    console.log(`⚠️  Found ${wronglyAssignedAdmins.length} DRIVER users with business_id (should be ADMIN):\n`);

    let updated = 0;
    for (const user of wronglyAssignedAdmins) {
      // Update their role to ADMIN
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'ADMIN' })
        .eq('id', user.id);

      if (updateError) {
        console.log(`❌ Failed to update ${user.email}: ${updateError.message}`);
      } else {
        console.log(`✅ Updated ${user.email} from DRIVER to ADMIN`);
        updated++;
      }
    }

    console.log(`\n📊 Summary: Updated ${updated} users\n`);

    // Also show any other DRIVER users (these are likely actual drivers who were invited)
    const { data: actualDrivers } = await supabase
      .from('users')
      .select('id, email, role, business_id')
      .eq('role', 'DRIVER')
      .is('business_id', null);

    if (actualDrivers && actualDrivers.length > 0) {
      console.log(`ℹ️  Actual DRIVER users (no business_id, correctly assigned):`);
      for (const driver of actualDrivers) {
        console.log(`   - ${driver.email}`);
      }
    }

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
}

fixAdminRoles();
