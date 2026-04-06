import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const prisma = new PrismaClient();

async function provisionUser(email: string, password: string, name: string, role: 'ADMIN' | 'DRIVER') {
  console.log(`\n--- Provisioning ${role}: ${email} ---`);

  // 1. Check if user exists in Supabase Auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  let supabaseUser = users.find(u => u.email === email);

  if (!supabaseUser) {
    console.log(`Creating user in Supabase Auth...`);
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role }
    });

    if (createError) throw createError;
    supabaseUser = user!;
    console.log(`Supabase user created: ${supabaseUser.id}`);
  } else {
    console.log(`Supabase user already exists: ${supabaseUser.id}`);
  }

  // 2. Sync with PostgreSQL 'users' table
  console.log(`Syncing with PostgreSQL 'users' table...`);
  const dbUser = await prisma.user.upsert({
    where: { email },
    update: { 
      id: supabaseUser.id,
      name,
      role
    },
    create: {
      id: supabaseUser.id,
      email,
      name,
      role
    }
  });

  // 3. Special handling for DRIVER role (link to existing Driver profile if email matches)
  if (role === 'DRIVER') {
    const driverProfile = await prisma.driver.findUnique({
      where: { email }
    });

    if (driverProfile) {
      console.log(`Linking Auth User to existing Driver profile: ${driverProfile.id}`);
      await prisma.driver.update({
        where: { id: driverProfile.id },
        data: { user_id: dbUser.id }
      });
    } else {
      console.log(`Warning: No existing Driver profile found for ${email}. Creating one...`);
      await prisma.driver.create({
        data: {
          user_id: dbUser.id,
          name,
          email,
          license_no: `ABC-${Math.floor(Math.random() * 1000000)}`,
          status: 'ACTIVE'
        }
      });
    }
  }

  console.log(`✅ ${role} provisioned successfully.`);
}

async function main() {
  try {
    await provisionUser(
      'admin@fleetsync.com.au',
      'admin123',
      'Fleet Admin',
      'ADMIN'
    );

    await provisionUser(
      'driver@fleetsync.com.au',
      'driver123',
      'Demo Driver',
      'DRIVER'
    );

    console.log('\n🚀 Provisioning Complete!');
  } catch (error) {
    console.error('\n❌ Provisioning Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
