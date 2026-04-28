import { test, expect } from '@playwright/test';
import { SELECTORS } from './helpers/selectors';
import {
  createTestUser,
  deleteTestUser,
  getBusinessByName,
  deleteTestBusiness,
} from './helpers/supabase-admin';

// Test data
const timestamp = Date.now();
const adminEmail = `admin-${timestamp}@test.com`;
const driverEmail = `driver-${timestamp}@test.com`;
const adminPassword = 'AdminTest123!';
const driverPassword = 'DriverTest123!';
const businessName = 'E2E Test Fleet';
const vehiclePlate = `TST${Math.floor(Math.random() * 999)
  .toString()
  .padStart(3, '0')}`;
const vehicleVin = `TEST${timestamp}`;

test('Complete E2E Flow: Signup → Business → Vehicle → Driver → Rental → Invoice → Payment', async ({
  page,
  browser,
}) => {
  test.setTimeout(300000); // 5 minutes for entire flow

  let driverContext;
  let driverPage;
  let onboardingLink = '';

  try {
    // SETUP: Pre-create driver auth account using Supabase Admin API
    console.log('\n🔧 Setting up test environment...');
    await createTestUser(driverEmail, driverPassword);
    console.log(`✅ Created driver auth user: ${driverEmail}\n`);

    const adminPage = page;

    // ========================================
    // STEP 1: Admin signs up at /
    // ========================================
    console.log('📝 STEP 1: Admin signs up...');
    await adminPage.goto('/', { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(2000);

    // Fill signup form (it's embedded on the landing page)
    await adminPage.fill(SELECTORS.signup.fullNameInput, 'Test Admin');
    await adminPage.fill(SELECTORS.signup.emailInput, adminEmail);

    // Use explicit selectors for password fields
    const passwordInputs = await adminPage.locator('input[type="password"]').all();
    if (passwordInputs.length >= 2) {
      await passwordInputs[0].fill(adminPassword);
      await passwordInputs[1].fill(adminPassword);
    } else {
      await adminPage.fill(SELECTORS.signup.passwordInput, adminPassword);
      await adminPage.fill(SELECTORS.signup.confirmInput, adminPassword);
    }

    // Click submit button
    await adminPage.click(SELECTORS.signup.submitButton);

    // Wait for navigation to setup-business
    await adminPage.waitForURL('**/setup-business', { timeout: 20000 });
    console.log('✅ Admin signed up successfully\n');

    // ========================================
    // STEP 2: Business Setup
    // ========================================
    console.log('🏢 STEP 2: Admin sets up business...');
    await adminPage.fill(SELECTORS.businessSetup.nameInput, businessName);
    await adminPage.fill(SELECTORS.businessSetup.addressInput, '1 Test St, Sydney NSW 2000');
    await adminPage.fill(SELECTORS.businessSetup.phoneInput, '+61400000001');

    await adminPage.click(SELECTORS.businessSetup.submitButton);
    await adminPage.waitForURL('**/admin', { timeout: 15000 });
    console.log('✅ Business setup complete\n');

    // ========================================
    // STEP 3: Add Vehicle
    // ========================================
    console.log('🚗 STEP 3: Admin adds a vehicle...');
    await adminPage.goto('/admin/fleet');
    await adminPage.waitForSelector(SELECTORS.fleet.addVehicleButton);

    await adminPage.click(SELECTORS.fleet.addVehicleButton);
    await adminPage.waitForSelector(SELECTORS.dialog);

    // Fill vehicle form
    await adminPage.fill(SELECTORS.fleet.vinInput, vehicleVin);
    await adminPage.fill(SELECTORS.fleet.plateInput, vehiclePlate);
    await adminPage.fill(SELECTORS.fleet.makeInput, 'Toyota');
    await adminPage.fill(SELECTORS.fleet.modelInput, 'Camry');
    await adminPage.fill(SELECTORS.fleet.yearInput, '2022');
    await adminPage.fill(SELECTORS.fleet.colorInput, 'White');
    await adminPage.fill(SELECTORS.fleet.regoExpiryInput, '2027-01-01');
    await adminPage.fill(SELECTORS.fleet.ctpExpiryInput, '2027-01-01');
    await adminPage.fill(SELECTORS.fleet.pinkSlipExpiryInput, '2027-01-01');
    await adminPage.fill(SELECTORS.fleet.weeklyRateInput, '450');
    await adminPage.fill(SELECTORS.fleet.bondAmountInput, '1000');

    await adminPage.click(SELECTORS.fleet.createVehicleButton);
    await adminPage.waitForSelector(SELECTORS.dialog, { state: 'hidden' });
    await adminPage.waitForSelector(`text="${vehiclePlate}"`, { timeout: 10000 });
    console.log(`✅ Vehicle created (plate: ${vehiclePlate})\n`);

    // ========================================
    // STEP 4: Invite Driver
    // ========================================
    console.log('👤 STEP 4: Admin invites a driver...');
    await adminPage.goto('/admin/drivers');
    await adminPage.waitForSelector(SELECTORS.drivers.inviteButton);

    await adminPage.click(SELECTORS.drivers.inviteButton);
    await adminPage.waitForSelector(SELECTORS.dialog);

    await adminPage.fill(SELECTORS.drivers.emailInput, driverEmail);
    await adminPage.click(SELECTORS.drivers.generateLinkButton);

    // Extract onboarding link
    await adminPage.waitForSelector(SELECTORS.drivers.onboardingLinkInput);
    onboardingLink = (await adminPage.inputValue(SELECTORS.drivers.onboardingLinkInput)) || '';
    console.log(`✅ Onboarding link generated: ${onboardingLink}\n`);

    await adminPage.click(SELECTORS.drivers.doneButton);
    await adminPage.waitForSelector(SELECTORS.dialog, { state: 'hidden' });

    // ========================================
    // STEP 5: Driver Completes Onboarding
    // ========================================
    console.log('📋 STEP 5: Driver completes onboarding...');
    driverContext = await browser.newContext();
    driverPage = await driverContext.newPage();

    await driverPage.goto(onboardingLink);
    await driverPage.waitForSelector(SELECTORS.onboarding.firstNameInput, { timeout: 10000 });

    await driverPage.fill(SELECTORS.onboarding.firstNameInput, 'Test');
    await driverPage.fill(SELECTORS.onboarding.lastNameInput, 'Driver');
    await driverPage.fill(SELECTORS.onboarding.phoneInput, '+61400000002');
    await driverPage.fill(SELECTORS.onboarding.addressInput, '2 Driver St, Melbourne VIC 3000');
    await driverPage.fill(SELECTORS.onboarding.licenseNumberInput, 'LIC123456');
    await driverPage.fill(SELECTORS.onboarding.licenseExpiryInput, '2028-06-30');

    await driverPage.click(SELECTORS.onboarding.submitButton);
    await driverPage.waitForSelector(SELECTORS.onboarding.successMessage, { timeout: 10000 });
    console.log('✅ Driver onboarding complete\n');

    // ========================================
    // STEP 6: Admin Approves Driver
    // ========================================
    console.log('✅ STEP 6: Admin approves driver...');
    await adminPage.goto('/admin/drivers');
    await adminPage.waitForTimeout(2000);

    // Find and click approve button
    const driverRow = adminPage.locator(`[role="row"]:has-text("${driverEmail}")`);
    await driverRow.waitFor({ timeout: 10000 });

    // Click green checkmark button
    const approveBtn = driverRow.locator('button').first();
    await approveBtn.click();

    await adminPage.waitForSelector(SELECTORS.dialog);
    await adminPage.click(SELECTORS.drivers.confirmApprovalButton);
    await adminPage.waitForSelector(SELECTORS.dialog, { state: 'hidden' });
    await adminPage.waitForTimeout(1000);
    console.log('✅ Driver approved\n');

    // ========================================
    // STEP 7: Create Rental
    // ========================================
    console.log('🚙 STEP 7: Admin creates a rental...');
    await adminPage.goto('/admin/rentals');
    await adminPage.waitForTimeout(1000);

    // Click Available Fleet tab
    await adminPage.click(SELECTORS.rentals.availableFleetTab);
    await adminPage.waitForTimeout(1000);

    // Find vehicle and click assign
    const vehicleCard = adminPage.locator(`[role="card"]:has-text("${vehiclePlate}")`).first();
    const assignBtn = vehicleCard.locator('button').first();
    await assignBtn.click();

    await adminPage.waitForSelector(SELECTORS.dialog);

    // Select driver
    const driverSelect = adminPage.locator(SELECTORS.rentals.driverSelectDropdown).first();
    await driverSelect.selectOption(driverEmail);

    await adminPage.click(SELECTORS.rentals.createRentalButton);
    await adminPage.waitForSelector(SELECTORS.dialog, { state: 'hidden' });
    await adminPage.waitForTimeout(1500);
    console.log('✅ Rental created\n');

    // ========================================
    // STEP 8: Generate Invoice
    // ========================================
    console.log('📄 STEP 8: Admin generates invoice...');
    await adminPage.goto('/admin/invoices');
    await adminPage.waitForTimeout(1000);

    await adminPage.click(SELECTORS.invoices.generateInvoicesButton);
    await adminPage.waitForTimeout(3000);

    const pendingInvoice = adminPage.locator('text="PENDING"').first();
    await pendingInvoice.waitFor({ timeout: 10000 });
    console.log('✅ Invoice generated\n');

    // ========================================
    // STEP 9: Mark Invoice as Paid
    // ========================================
    console.log('💰 STEP 9: Admin marks invoice as paid...');
    await adminPage.reload();
    await adminPage.waitForTimeout(1500);

    // Find PENDING invoice and click Paid
    const invoiceRow = adminPage.locator(`[role="row"]:has-text("${driverEmail}"):has-text("PENDING")`).first();
    await invoiceRow.waitFor({ timeout: 10000 });

    // Click the paid button (usually a checkmark icon in the row)
    const paidBtn = invoiceRow.locator('button').nth(1); // Usually second button is "Paid"
    await paidBtn.click();

    await adminPage.waitForTimeout(2000);
    console.log('✅ Invoice marked as paid\n');

    // ========================================
    // STEP 10: Driver Verifies Payment
    // ========================================
    console.log('🎉 STEP 10: Driver verifies payment...');
    await driverPage.goto('/login');
    await driverPage.waitForSelector(SELECTORS.login.emailInput, { timeout: 10000 });

    await driverPage.fill(SELECTORS.login.emailInput, driverEmail);
    await driverPage.fill(SELECTORS.login.passwordInput, driverPassword);
    await driverPage.click(SELECTORS.login.signInButton);

    await driverPage.waitForURL('**/dashboard', { timeout: 15000 });

    await driverPage.goto('/dashboard/payments');
    await driverPage.waitForSelector('text="Billing History"', { timeout: 10000 });

    // Verify PAID status exists
    const paidStatus = driverPage.locator('text="PAID"').first();
    await paidStatus.waitFor({ timeout: 10000 });

    console.log('✅ Driver verified invoice is PAID\n');
    console.log('🎊 ========================================');
    console.log('🎊 FULL BUSINESS FLOW TEST PASSED! 🎊');
    console.log('🎊 ========================================\n');
  } finally {
    // CLEANUP
    console.log('🧹 Cleaning up test data...');
    try {
      const business = await getBusinessByName(businessName);
      if (business?.id) {
        await deleteTestBusiness(business.id);
      }
      await deleteTestUser(adminEmail);
      await deleteTestUser(driverEmail);
      console.log('✅ Cleanup complete\n');
    } catch (err) {
      console.error('Cleanup error:', err);
    }

    // Close driver context
    if (driverContext) {
      await driverContext.close();
    }
  }
});
