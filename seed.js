import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const dummyOperators = [
  {
    email: 'op1@kisanflow.com',
    password: 'password123',
    name: 'Suresh Kumar',
    phone: '9848011111',
    role: 'operator',
    designation: 'PENDING',
    centre_id: 'c1' // Warangal Enumamula
  },
  {
    email: 'op2@kisanflow.com',
    password: 'password123',
    name: 'Ramesh Babu',
    phone: '9848022222',
    role: 'operator',
    designation: 'PENDING',
    centre_id: 'c2' // Khammam APMC
  }
];

async function seed() {
  for (const op of dummyOperators) {
    console.log(`Processing ${op.email}...`);
    let user = null;
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: op.email,
      password: op.password,
      options: { data: { name: op.name, role: op.role, phone: op.phone } }
    });

    if (signUpError && signUpError.message.includes('already registered')) {
       console.log(`User already registered, logging in to get ID...`);
       const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
         email: op.email,
         password: op.password
       });
       if (signInData.user) user = signInData.user;
       else console.log(`SignIn Error: ${signInError?.message}`);
    } else if (signUpData.user) {
       user = signUpData.user;
    }

    if (user) {
      console.log(`Upserting profile for ${op.email}...`);
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        role: op.role,
        name: op.name,
        phone: op.phone,
        email: op.email,
        designation: op.designation,
        centre_id: op.centre_id,
        updated_at: new Date().toISOString()
      });
      if (profileError) {
        console.log(`Profile Error for ${op.email}:`, profileError.message);
      } else {
        console.log(`Success: ${op.email}`);
      }
    }
  }
  console.log('Seeding complete.');
}

seed();
