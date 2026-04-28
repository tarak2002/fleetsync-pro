import axios from 'axios';

async function testValidation() {
    const token = 'e7289c5b-ee96-4b48-a61e-7d4db762ccfb'; // Known valid token from DB
    console.log(`Testing validation for token: ${token}`);
    try {
        const response = await axios.get(`http://localhost:3001/api/onboarding/validate/${token}`);
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testValidation();
