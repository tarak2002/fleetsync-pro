import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const EMAIL = 'admin@fleetsyncpro.com.au';
const PASSWORD = 'FleetSync789!';
const BASE_URL = 'http://localhost:3001/api';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testBusinesses() {
    try {
        console.log('Logging in via Supabase...');
        const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
        if (error) throw error;
        const token = data.session?.access_token;
        console.log('Token received');

        console.log('Fetching businesses from local API...');
        const res = await axios.get(`${BASE_URL}/businesses`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Response Status:', res.status);
        console.log('Businesses:', res.data);
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testBusinesses();
