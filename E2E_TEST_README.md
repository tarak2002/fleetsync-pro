# End-to-End Test Guide

This guide explains the complete end-to-end Playwright test suite for FleetSync Pro.

---

## What's Being Tested

The test (`e2e/full-flow.spec.ts`) validates the entire business flow:

```
STEP 1  → Admin signs up at /signup
STEP 2  → Admin sets up business at /setup-business
STEP 3  → Admin adds a vehicle at /admin/fleet
STEP 4  → Admin invites a driver (generates onboarding link) at /admin/drivers
STEP 5  → Driver completes onboarding at /onboard/:token
STEP 6  → Admin approves driver at /admin/drivers
STEP 7  → Admin creates rental (assigns driver to vehicle) at /admin/rentals
STEP 8  → Admin generates invoice at /admin/invoices
STEP 9  → Admin marks invoice as PAID at /admin/invoices
STEP 10 → Driver logs in and verifies invoice is PAID at /dashboard/payments
```

---

## Installation

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install chromium
```

---

## Running the Tests

### Option 1: Automatic (Dev server starts automatically)

```bash
npm run test:e2e
```

The `webServer` config in `playwright.config.ts` will automatically start `npm run dev` for you.

### Option 2: Manual (Start dev server separately)

Terminal 1 — Start the dev server:
```bash
npm run dev
```

Terminal 2 — Run tests:
```bash
npx playwright test
```

### Option 3: Interactive Playwright UI (Debugging)

```bash
npx playwright test --ui
```

This opens the Playwright Inspector where you can step through tests, inspect elements, and see live screenshots.

---

## Test Data

Each test run uses unique identifiers:

```
Admin Email:     admin-<TIMESTAMP>@test.com
Driver Email:    driver-<TIMESTAMP>@test.com
Admin Password:  AdminTest123!
Driver Password: DriverTest123!
Business Name:   E2E Test Fleet
Vehicle Plate:   TST### (random 3-digit number)
Vehicle VIN:     TEST<TIMESTAMP>
```

---

## Key Implementation Details

### Driver Authentication Gap

The backend's `POST /api/onboarding/submit-application` is a stub that doesn't create auth accounts. The test works around this by:

1. **Pre-creating the driver's Supabase auth account** in `beforeAll()` using the Admin API
2. Driver completes onboarding (frontend form only)
3. Driver logs in using the pre-created auth account

This is handled automatically in `test.beforeAll()` — you don't need to do anything manually.

### Selectors

All selectors are in `e2e/helpers/selectors.ts`. Since the app has no `data-testid` attributes:
- Uses visible label text
- Uses placeholder text
- Uses button text
- Uses a few explicit element IDs (`#vin`, `#plate`, `#email`, etc.)

### Helper Functions

`e2e/helpers/supabase-admin.ts` provides:
- `createTestUser()` — Creates Supabase auth account
- `deleteTestUser()` — Deletes Supabase auth account
- `deleteTestBusiness()` — Cleans up all test data (cascade delete)
- `getBusinessByName()` — Lookup business by name
- `cleanupTestData()` — Full cleanup

---

## Troubleshooting

### "Port 5173 already in use"

If you already have a dev server running, either:
1. Stop the other process
2. Or comment out the `webServer` config in `playwright.config.ts` and start the server manually

### "Timeout: 30000ms exceeded"

- The dev server might be slow to start
- Increase the `timeout` in `playwright.config.ts` (currently 60s)
- Or manually start `npm run dev` before running tests

### "Dialog didn't appear"

- Add a longer wait: `await page.waitForTimeout(500)` before clicking
- Or increase `timeout` for that specific step

### "Supabase Admin API failed"

- Verify `SUPABASE_SERVICE_ROLE_KEY` is available (should be in `.env`)
- Check Supabase credentials in the test file

---

## Output Files

After running tests, Playwright creates:

```
test-results/          ← HTML report with screenshots/videos
playwright-report.html ← Open this in a browser to see detailed results
```

To view the HTML report:
```bash
npx playwright show-report
```

---

## Test Configuration

All Playwright settings are in `playwright.config.ts`:

| Setting | Value | Purpose |
|---------|-------|---------|
| `headless` | `false` | Shows browser window (better for debugging) |
| `screenshot` | `only-on-failure` | Captures screenshot if test fails |
| `video` | `retain-on-failure` | Records video if test fails |
| `trace` | `retain-on-failure` | Records trace for debugging |
| `timeout` | `60_000` | 60-second timeout per test |
| `baseURL` | `http://localhost:5173` | Assumes dev server here |

---

## Next Steps

1. **Install dependencies**: `npm install`
2. **Run tests**: `npm run test:e2e`
3. **View results**: Check browser window or `npx playwright show-report`

If all 10 steps pass, the business flow is working end-to-end! 🎉

---

## Notes for Developers

### Driver Auth Limitation (Future Fix)

The current system's driver onboarding is incomplete. To make it fully self-service:

1. Implement `POST /api/onboarding/submit-application` to:
   - Create driver record in DB
   - Create Supabase auth account with temporary password
   - Send password to driver via email

2. Update the frontend `Onboarding.tsx` to call this properly

For now, the test creates the driver's auth account directly via Admin API.

### Running Single Steps

To debug a specific step, comment out the other tests:

```typescript
test.skip('Step 1: Admin signs up', ...)  // Skip this
test('Step 2: Admin sets up business', ...) // Run this
```

Then run: `npx playwright test --ui`

---

## CI/CD Integration

For GitHub Actions or other CI platforms:

```yaml
- name: Install dependencies
  run: npm install

- name: Install Playwright
  run: npx playwright install chromium

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-results
    path: test-results/
```
