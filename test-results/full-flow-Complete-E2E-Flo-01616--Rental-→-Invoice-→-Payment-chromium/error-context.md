# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow.spec.ts >> Complete E2E Flow: Signup → Business → Vehicle → Driver → Rental → Invoice → Payment
- Location: e2e\full-flow.spec.ts:22:1

# Error details

```
Error: page.fill: Target page, context or browser has been closed
Call log:
  - waiting for locator('input[placeholder="123 Fleet St, Sydney NSW 2000"]')
    - locator resolved to <input value="" required="" placeholder="123 Fleet St, Sydney NSW 2000" class="flex w-full border px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-14 pl-11 bg-slate-50/50 border-slate-200 rounded-2xl focus:bg-white focus:ring-primary/10 focus:border-primary transition-all …/>
    - fill("1 Test St, Sydney NSW 2000")
  - attempting fill action
    - waiting for element to be visible, enabled and editable
  - element was detached from the DOM, retrying

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { SELECTORS } from './helpers/selectors';
  3   | import {
  4   |   createTestUser,
  5   |   deleteTestUser,
  6   |   getBusinessByName,
  7   |   deleteTestBusiness,
  8   | } from './helpers/supabase-admin';
  9   | 
  10  | // Test data
  11  | const timestamp = Date.now();
  12  | const adminEmail = `admin-${timestamp}@test.com`;
  13  | const driverEmail = `driver-${timestamp}@test.com`;
  14  | const adminPassword = 'AdminTest123!';
  15  | const driverPassword = 'DriverTest123!';
  16  | const businessName = 'E2E Test Fleet';
  17  | const vehiclePlate = `TST${Math.floor(Math.random() * 999)
  18  |   .toString()
  19  |   .padStart(3, '0')}`;
  20  | const vehicleVin = `TEST${timestamp}`;
  21  | 
  22  | test('Complete E2E Flow: Signup → Business → Vehicle → Driver → Rental → Invoice → Payment', async ({
  23  |   page,
  24  |   browser,
  25  | }) => {
  26  |   test.setTimeout(300000); // 5 minutes for entire flow
  27  | 
  28  |   let driverContext;
  29  |   let driverPage;
  30  |   let onboardingLink = '';
  31  | 
  32  |   try {
  33  |     // SETUP: Pre-create driver auth account using Supabase Admin API
  34  |     console.log('\n🔧 Setting up test environment...');
  35  |     await createTestUser(driverEmail, driverPassword);
  36  |     console.log(`✅ Created driver auth user: ${driverEmail}\n`);
  37  | 
  38  |     const adminPage = page;
  39  | 
  40  |     // ========================================
  41  |     // STEP 1: Admin signs up at /
  42  |     // ========================================
  43  |     console.log('📝 STEP 1: Admin signs up...');
  44  |     await adminPage.goto('/', { waitUntil: 'networkidle' });
  45  |     await adminPage.waitForTimeout(2000);
  46  | 
  47  |     // Fill signup form (it's embedded on the landing page)
  48  |     await adminPage.fill(SELECTORS.signup.fullNameInput, 'Test Admin');
  49  |     await adminPage.fill(SELECTORS.signup.emailInput, adminEmail);
  50  | 
  51  |     // Use explicit selectors for password fields
  52  |     const passwordInputs = await adminPage.locator('input[type="password"]').all();
  53  |     if (passwordInputs.length >= 2) {
  54  |       await passwordInputs[0].fill(adminPassword);
  55  |       await passwordInputs[1].fill(adminPassword);
  56  |     } else {
  57  |       await adminPage.fill(SELECTORS.signup.passwordInput, adminPassword);
  58  |       await adminPage.fill(SELECTORS.signup.confirmInput, adminPassword);
  59  |     }
  60  | 
  61  |     // Click submit button
  62  |     await adminPage.click(SELECTORS.signup.submitButton);
  63  | 
  64  |     // Wait for navigation to setup-business
  65  |     await adminPage.waitForURL('**/setup-business', { timeout: 20000 });
  66  |     console.log('✅ Admin signed up successfully\n');
  67  | 
  68  |     // ========================================
  69  |     // STEP 2: Business Setup
  70  |     // ========================================
  71  |     console.log('🏢 STEP 2: Admin sets up business...');
  72  |     await adminPage.fill(SELECTORS.businessSetup.nameInput, businessName);
> 73  |     await adminPage.fill(SELECTORS.businessSetup.addressInput, '1 Test St, Sydney NSW 2000');
      |                     ^ Error: page.fill: Target page, context or browser has been closed
  74  |     await adminPage.fill(SELECTORS.businessSetup.phoneInput, '+61400000001');
  75  | 
  76  |     await adminPage.click(SELECTORS.businessSetup.submitButton);
  77  |     await adminPage.waitForURL('**/admin', { timeout: 15000 });
  78  |     console.log('✅ Business setup complete\n');
  79  | 
  80  |     // ========================================
  81  |     // STEP 3: Add Vehicle
  82  |     // ========================================
  83  |     console.log('🚗 STEP 3: Admin adds a vehicle...');
  84  |     await adminPage.goto('/admin/fleet');
  85  |     await adminPage.waitForSelector(SELECTORS.fleet.addVehicleButton);
  86  | 
  87  |     await adminPage.click(SELECTORS.fleet.addVehicleButton);
  88  |     await adminPage.waitForSelector(SELECTORS.dialog);
  89  | 
  90  |     // Fill vehicle form
  91  |     await adminPage.fill(SELECTORS.fleet.vinInput, vehicleVin);
  92  |     await adminPage.fill(SELECTORS.fleet.plateInput, vehiclePlate);
  93  |     await adminPage.fill(SELECTORS.fleet.makeInput, 'Toyota');
  94  |     await adminPage.fill(SELECTORS.fleet.modelInput, 'Camry');
  95  |     await adminPage.fill(SELECTORS.fleet.yearInput, '2022');
  96  |     await adminPage.fill(SELECTORS.fleet.colorInput, 'White');
  97  |     await adminPage.fill(SELECTORS.fleet.regoExpiryInput, '2027-01-01');
  98  |     await adminPage.fill(SELECTORS.fleet.ctpExpiryInput, '2027-01-01');
  99  |     await adminPage.fill(SELECTORS.fleet.pinkSlipExpiryInput, '2027-01-01');
  100 |     await adminPage.fill(SELECTORS.fleet.weeklyRateInput, '450');
  101 |     await adminPage.fill(SELECTORS.fleet.bondAmountInput, '1000');
  102 | 
  103 |     await adminPage.click(SELECTORS.fleet.createVehicleButton);
  104 |     await adminPage.waitForSelector(SELECTORS.dialog, { state: 'hidden' });
  105 |     await adminPage.waitForSelector(`text="${vehiclePlate}"`, { timeout: 10000 });
  106 |     console.log(`✅ Vehicle created (plate: ${vehiclePlate})\n`);
  107 | 
  108 |     // ========================================
  109 |     // STEP 4: Invite Driver
  110 |     // ========================================
  111 |     console.log('👤 STEP 4: Admin invites a driver...');
  112 |     await adminPage.goto('/admin/drivers');
  113 |     await adminPage.waitForSelector(SELECTORS.drivers.inviteButton);
  114 | 
  115 |     await adminPage.click(SELECTORS.drivers.inviteButton);
  116 |     await adminPage.waitForSelector(SELECTORS.dialog);
  117 | 
  118 |     await adminPage.fill(SELECTORS.drivers.emailInput, driverEmail);
  119 |     await adminPage.click(SELECTORS.drivers.generateLinkButton);
  120 | 
  121 |     // Extract onboarding link
  122 |     await adminPage.waitForSelector(SELECTORS.drivers.onboardingLinkInput);
  123 |     onboardingLink = (await adminPage.inputValue(SELECTORS.drivers.onboardingLinkInput)) || '';
  124 |     console.log(`✅ Onboarding link generated: ${onboardingLink}\n`);
  125 | 
  126 |     await adminPage.click(SELECTORS.drivers.doneButton);
  127 |     await adminPage.waitForSelector(SELECTORS.dialog, { state: 'hidden' });
  128 | 
  129 |     // ========================================
  130 |     // STEP 5: Driver Completes Onboarding
  131 |     // ========================================
  132 |     console.log('📋 STEP 5: Driver completes onboarding...');
  133 |     driverContext = await browser.newContext();
  134 |     driverPage = await driverContext.newPage();
  135 | 
  136 |     await driverPage.goto(onboardingLink);
  137 |     await driverPage.waitForSelector(SELECTORS.onboarding.firstNameInput, { timeout: 10000 });
  138 | 
  139 |     await driverPage.fill(SELECTORS.onboarding.firstNameInput, 'Test');
  140 |     await driverPage.fill(SELECTORS.onboarding.lastNameInput, 'Driver');
  141 |     await driverPage.fill(SELECTORS.onboarding.phoneInput, '+61400000002');
  142 |     await driverPage.fill(SELECTORS.onboarding.addressInput, '2 Driver St, Melbourne VIC 3000');
  143 |     await driverPage.fill(SELECTORS.onboarding.licenseNumberInput, 'LIC123456');
  144 |     await driverPage.fill(SELECTORS.onboarding.licenseExpiryInput, '2028-06-30');
  145 | 
  146 |     await driverPage.click(SELECTORS.onboarding.submitButton);
  147 |     await driverPage.waitForSelector(SELECTORS.onboarding.successMessage, { timeout: 10000 });
  148 |     console.log('✅ Driver onboarding complete\n');
  149 | 
  150 |     // ========================================
  151 |     // STEP 6: Admin Approves Driver
  152 |     // ========================================
  153 |     console.log('✅ STEP 6: Admin approves driver...');
  154 |     await adminPage.goto('/admin/drivers');
  155 |     await adminPage.waitForTimeout(2000);
  156 | 
  157 |     // Find and click approve button
  158 |     const driverRow = adminPage.locator(`[role="row"]:has-text("${driverEmail}")`);
  159 |     await driverRow.waitFor({ timeout: 10000 });
  160 | 
  161 |     // Click green checkmark button
  162 |     const approveBtn = driverRow.locator('button').first();
  163 |     await approveBtn.click();
  164 | 
  165 |     await adminPage.waitForSelector(SELECTORS.dialog);
  166 |     await adminPage.click(SELECTORS.drivers.confirmApprovalButton);
  167 |     await adminPage.waitForSelector(SELECTORS.dialog, { state: 'hidden' });
  168 |     await adminPage.waitForTimeout(1000);
  169 |     console.log('✅ Driver approved\n');
  170 | 
  171 |     // ========================================
  172 |     // STEP 7: Create Rental
  173 |     // ========================================
```