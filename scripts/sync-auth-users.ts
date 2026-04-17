import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Service Role Key is missing in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log('Starting Auth User Sync...');

  // Get all users from public.users
  const { data: users, error: fetchError } = await supabase.from('users').select('*');
  if (fetchError || !users) {
    console.error('Failed to fetch users:', fetchError);
    return;
  }

  // Get all auth users
  const { data: authUsersData, error: authFetchError } = await supabase.auth.admin.listUsers();
  const authUsers = authUsersData?.users || [];

  for (const user of users) {
    console.log(`Processing user: ${user.email}`);

    // If it's already a UUID, and exists in auth.users, skip
    if (user.id.includes('-') && authUsers.find(u => u.id === user.id)) {
        console.log(`User ${user.email} is already synced.`);
        continue;
    }

    let newId;

    // Check if auth user already exists from previous failed run
    const existingAuthUser = authUsers.find(u => u.email === user.email);
    if (existingAuthUser) {
        newId = existingAuthUser.id;
        console.log(`Found existing Auth user: ${newId}`);
    } else {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'FleetSync789!',
          email_confirm: true,
          user_metadata: {
            name: user.name,
            role: user.role
          }
        });

        if (authError) {
          console.error(`Failed to create Auth account for ${user.email}:`, authError.message);
          continue;
        }
        newId = authData.user.id;
        console.log(`Created new Auth user: ${newId}`);
    }

    const oldId = user.id;

    console.log(`Migrating data for ${user.email} (Old: ${oldId} -> New: ${newId})...`);

    // Fetch drivers that reference this user
    const { data: drivers } = await supabase.from('drivers').select('id').eq('user_id', oldId);
    if (drivers && drivers.length > 0) {
        // Set their user_id to NULL temporarily to break constraint
        await supabase.from('drivers').update({ user_id: null }).eq('user_id', oldId);
    }

    // Delete the old record BEFORE inserting to avoid unique constraint on email
    const { error: deleteError } = await supabase.from('users').delete().eq('id', oldId);
    if (deleteError) {
        console.warn(`Failed to delete old user record ${oldId}: ${deleteError.message}`);
        continue;
    }

    // Insert new user
    const { error: insertError } = await supabase.from('users').insert({
        id: newId,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
    });

    if (insertError) {
        console.error(`Failed to insert new user record: ${insertError.message}`);
        continue;
    }

    // Now re-link drivers
    if (drivers && drivers.length > 0) {
        for (const driver of drivers) {
            await supabase.from('drivers').update({ user_id: newId }).eq('id', driver.id);
        }
    }

    console.log(`Successfully migrated ${user.email}`);
  }

  console.log('Sync complete.');
}

run().catch(console.error);
