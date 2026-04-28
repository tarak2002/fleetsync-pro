import axios from 'axios';

const TOKEN = '092f4189-12c2-4f9f-aa23-09cef4f7f5a6';
const BASE_URL = 'http://localhost:3001/api';

async function testOnboarding() {
    try {
        console.log('Testing onboarding submission...');
        const response = await axios.post(`${BASE_URL}/onboarding/submit`, {
            token: TOKEN,
            data: {
                name: 'John Driver',
                password: 'password123',
                phone: '0400000000',
                licenseNo: 'L' + Math.floor(Math.random() * 100000000),
                licenseExpiry: '2030-01-01'
            }
        });
        console.log('Success:', response.data);
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testOnboarding();
