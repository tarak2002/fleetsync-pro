import { chromium } from 'playwright';
import axios from 'axios';
import 'dotenv/config';

// Config from .env
const LINKT_USER = process.env.LINKT_CLIENT_ID;
const LINKT_PASS = process.env.LINKT_CLIENT_SECRET;
const FS_API_URL = process.env.VITE_API_URL || 'http://localhost:3001';
const FS_API_KEY = process.env.FLEETSYNC_API_KEY;

async function syncTolls() {
    console.log('🚀 Starting Linkt Sync...');
    
    if (!LINKT_USER || !LINKT_PASS) {
        console.error('❌ Error: LINKT_CLIENT_ID or LINKT_CLIENT_SECRET not found in .env');
        return;
    }

    if (!FS_API_KEY) {
        console.error('❌ Error: FLEETSYNC_API_KEY not found in .env');
        return;
    }

    const browser = await chromium.launch({ 
        headless: true 
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 1. Login to Linkt
        console.log('🔑 Logging into Linkt...');
        await page.goto('https://www.linkt.com.au/login');
        
        // Wait for username field (selectors may need adjustment based on Linkt's specific site)
        await page.waitForSelector('#username');
        await page.fill('#username', LINKT_USER);
        await page.fill('#password', LINKT_PASS);
        await page.click('button[type="submit"]');
        
        // Wait for dashboard or post-login indicator
        await page.waitForTimeout(5000); // Wait for redirects
        console.log('✅ Login successful or processing...');

        // 2. Navigate to Trip History (Sydney example)
        console.log('📂 Navigating to Trip History...');
        await page.goto('https://www.linkt.com.au/sydney/manage-your-account/trip-history');
        await page.waitForTimeout(3000);

        // 3. Extract Data from Table
        // This is a generic selector - in production, we would refine this based on Linkt's actual DOM
        console.log('🔍 Scraping trips...');
        const tolls = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr'));
            return rows.map(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 4) return null;

                return {
                    date: cells[0]?.innerText?.trim(),
                    plate: cells[1]?.innerText?.trim(),
                    location: cells[2]?.innerText?.trim(),
                    amount: parseFloat(cells[3]?.innerText?.replace(/[^\d.]/g, '') || '0'),
                    provider_tx_id: `LINKT_${cells[4]?.innerText?.trim() || Date.now()}`
                };
            }).filter(t => t !== null && t.plate && t.amount > 0);
        });

        console.log(`📊 Found ${tolls.length} trips to process.`);

        // 4. Push to FleetSync API
        if (tolls.length > 0) {
            console.log(`📡 Sending ${tolls.length} tolls to FleetSync API at ${FS_API_URL}...`);
            const response = await axios.post(`${FS_API_URL}/api/tolls/sync`, 
                { tolls },
                { 
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-api-key': FS_API_KEY 
                    } 
                }
            );
            console.log('🎉 Sync Result:', response.data);
        } else {
            console.log('ℹ️ No new tolls found to sync.');
        }

    } catch (error: any) {
        console.error('❌ Sync Failed:', error.message);
        // Take a screenshot for debugging if it fails
        await page.screenshot({ path: 'scripts/linkt-error-debug.png' });
        console.log('📸 Error screenshot saved to scripts/linkt-error-debug.png');
    } finally {
        await browser.close();
        console.log('👋 Browser closed.');
    }
}

syncTolls();
