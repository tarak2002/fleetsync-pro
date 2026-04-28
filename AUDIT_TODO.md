# FleetSync Pro - Audit Fix Todo List

## 🔴 HIGH PRIORITY (15 issues)

### 1. Missing Imports & Runtime Errors
- [ ] **VehicleSelection.tsx:88** - Add missing `useNavigate` import from react-router-dom
- [ ] **LandingPage.tsx:6** - Fix or remove broken `heroImage` import from '../assets/hero-dashboard.png'
- [ ] **DriverOperations.tsx:497-499** - Fix invalid image fallback path `/images/fleet/tesla.png`
- [ ] **VehicleSelection.tsx:42,56,70** - Fix non-existent mock image paths in MOCK_VEHICLES

### 2. Security Issues
- [ ] **Login.tsx:18-53** - Remove or secure dev endpoint `/api/auth/dev-create-user`
- [ ] **Login.tsx:91-98** - Remove hardcoded demo credentials from fillAdminCredentials/fillDriverCredentials
- [ ] **Login.tsx:22-31** - Remove role assignment from dev-create-user endpoint
- [ ] **App.tsx:66** - Add server-side role validation instead of trusting user_metadata

### 3. Missing Functionality
- [ ] **Onboarding.tsx** - Implement or remove empty Onboarding component
- [ ] **AddPaymentMethod.tsx** - Implement missing payment method page
- [ ] **PaymentStatus.tsx** - Implement missing payment status page

### 4. Route Issues
- [ ] **App.tsx:139** - Fix route mismatch: change `/admin/businesses` to `/admin/settings` OR update Layout.tsx:23 nav path

### 5. Data Issues
- [ ] **Dashboard.tsx:28** - Fix unused `selectedTrip` state or remove it
- [ ] **Dashboard.tsx:156-157** - Replace hardcoded map markers with actual vehicle data from API
- [ ] **LiveTracking.tsx:56-87** - Replace mock tracking data with real API integration
- [ ] **DriverOperations.tsx:418-422** - Replace hardcoded recent trips with API data

---

## 🟠 MEDIUM PRIORITY (42 issues)

### UI/UX - Non-functional Buttons
- [ ] **Dashboard.tsx:142** - Add onClick to "See All" button or remove it
- [ ] **Dashboard.tsx:408-411** - Add onClick to "View Full Analytics Report" or remove
- [ ] **Drivers.tsx:349-351** - Add onClick to "View Profile" button
- [ ] **DriverOperations.tsx:614-618** - Add onClick to "View All" in Recent Activity
- [ ] **DriverHistory.tsx:80-83** - Implement Export CSV functionality
- [ ] **DriverPayments.tsx:148-150** - Implement Tax Statement functionality
- [ ] **LiveTracking.tsx:127** - Implement filter button functionality or remove

### Data & State Issues
- [ ] **Rentals.tsx:80** - Implement price range filter or remove unused state
- [ ] **Rentals.tsx:82** - Implement vehicle type filter or remove unused state
- [ ] **DriverOperations.tsx:445-465** - Replace hardcoded stats with real API data
- [ ] **Fleet.tsx:371** - Fix search filter to work in real-time
- [ ] **Finance.tsx:12-13** - Fix date filter initialization

### Payment Issues
- [ ] **DriverPayments.tsx:268-270** - Replace hardcoded card display with real payment method
- [ ] **VehicleSelection.tsx:143** - Display hidden $15 fee clearly to user
- [ ] **Invoices.tsx:150-153** - Fix NaN display when tolls/fines are null

### API Integration
- [ ] **Fleet.tsx:105** - Add error handling for business fetch failure
- [ ] **Drivers.tsx:58-65** - Add user feedback for block API failure
- [ ] **Rentals.tsx:101** - Show specific error messages instead of generic alerts
- [ ] **VehicleSelection.tsx:95-110** - Show user feedback when falling back to mock data
- [ ] **DriverHistory.tsx:28-32** - Display error to user on API failure
- [ ] **LiveTracking.tsx:51-53** - Add error handling for dashboard fetch

### Form Validation
- [ ] **BusinessSetup.tsx:44** - Add validation for empty business name
- [ ] **Fleet.tsx:256** - Add VIN format validation (17 chars)
- [ ] **Fleet.tsx:347** - Prevent negative values in weekly rate
- [ ] **Signup.tsx:26-29** - Add password strength validation
- [ ] **Drivers.tsx:67-80** - Add email format validation
- [ ] **BusinessSettings.tsx:377-379** - Add ABN format validation (11 digits)

### Hardcoded Values
- [ ] **Rentals.tsx:403-408** - Replace hardcoded "5 Seats" and "Auto" with vehicle specs
- [ ] **Layout.tsx:143** - Fix timezone from hardcoded "UTC-7" to dynamic
- [ ] **Layout.tsx:148** - Make location dynamic based on business/user

### Code Quality
- [ ] **Dashboard.tsx:88** - Replace guess-based expense calculation with real data
- [ ] **VehicleSelection.tsx:121-122** - Add pickup/return date validation
- [ ] **DriverOperations.tsx:754** - Fix TypeScript non-null assertion
- [ ] **Rentals.tsx:169** - Add division by zero protection

---

## 🟡 LOW PRIORITY (7 issues)

### Accessibility
- [ ] **Login.tsx:178** - Fix or remove dead "Forgot password" link
- [ ] **Signup.tsx:203-204** - Fix or remove dead Terms/Privacy links
- [ ] **LandingPage.tsx:49-51** - Fix or remove dead anchor links

### Cleanup
- [ ] **Multiple files** - Remove all console.log debug statements from production code
- [ ] **Rentals.tsx:372** - Replace external unsplash URL fallback with local asset

---

## 📋 COMPLETED CHECKLIST

Initial audit completed. Start fixing from top (HIGH priority) and work down.

---
*Generated from comprehensive audit of FleetSync Pro application*
*Total Issues: 64 (15 HIGH, 42 MEDIUM, 7 LOW)*