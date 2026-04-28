import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ldyvkgyapjxyhjwsxanc.supabase.co';
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkeXZrZ3lhcGp4eWhqd3N4YW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIwNTM4OCwiZXhwIjoyMDkyNzgxMzg4fQ.iSLNYoeY8-eUpXrI_LkNhyaiIdzcS6PLqkACvdm25c4';

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Create a test Supabase auth user
 */
export async function createTestUser(email: string, password: string) {
  try {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email to skip email verification
    });

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data.user;
  } catch (err: any) {
    console.error('Error creating test user:', err.message);
    throw err;
  }
}

/**
 * Delete a Supabase auth user by email
 */
export async function deleteTestUser(email: string) {
  try {
    // First get the user ID by email
    const { data, error: getError } = await adminClient.auth.admin.listUsers();
    if (getError) {
      throw new Error(`Failed to list users: ${getError.message}`);
    }

    const user = data.users.find(u => u.email === email);
    if (!user) {
      console.log(`User ${email} not found`);
      return;
    }

    // Delete the user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    console.log(`Deleted user: ${email}`);
  } catch (err: any) {
    console.error('Error deleting test user:', err.message);
  }
}

/**
 * Delete test business and all related records
 */
export async function deleteTestBusiness(businessId: string) {
  try {
    // Delete in order of foreign key constraints
    // 1. Delete invoices
    await adminClient.from('invoices').delete().eq('id', businessId).then(r => {
      if (r.error && !r.error.message.includes('no rows')) {
        console.log('Invoices delete result:', r.error?.message);
      }
    });

    // 2. Delete rentals
    await adminClient.from('rentals').delete().eq('id', businessId).then(r => {
      if (r.error && !r.error.message.includes('no rows')) {
        console.log('Rentals delete result:', r.error?.message);
      }
    });

    // 3. Delete vehicles
    await adminClient.from('vehicles').delete().eq('business_id', businessId);

    // 4. Delete drivers
    await adminClient.from('drivers').delete().eq('business_id', businessId);

    // 5. Delete users associated with this business
    await adminClient.from('users').delete().eq('business_id', businessId);

    // 6. Delete business
    await adminClient.from('businesses').delete().eq('id', businessId);

    console.log(`Deleted business: ${businessId}`);
  } catch (err: any) {
    console.error('Error deleting test business:', err.message);
  }
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string) {
  try {
    const { data, error } = await adminClient.auth.admin.listUsers();
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    return data.users.find(u => u.email === email) || null;
  } catch (err: any) {
    console.error('Error getting user:', err.message);
    return null;
  }
}

/**
 * Get a test business by name
 */
export async function getBusinessByName(businessName: string) {
  try {
    const { data, error } = await adminClient
      .from('businesses')
      .select('*')
      .eq('name', businessName)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw new Error(`Failed to get business: ${error.message}`);
    }

    return data || null;
  } catch (err: any) {
    console.error('Error getting business:', err.message);
    return null;
  }
}

/**
 * Clean up test data: delete user and business
 */
export async function cleanupTestData(adminEmail: string, driverEmail: string, businessName: string) {
  console.log('Starting cleanup...');

  // Get business first to get ID
  const business = await getBusinessByName(businessName);
  if (business?.id) {
    await deleteTestBusiness(business.id);
  }

  // Delete auth users
  await deleteTestUser(adminEmail);
  await deleteTestUser(driverEmail);

  console.log('Cleanup complete');
}
