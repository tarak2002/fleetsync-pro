// Selectors for elements that have explicit IDs or are easy to identify by label/placeholder

export const SELECTORS = {
  // Global
  dialog: '[role="dialog"]',
  button: (text: string) => `button:has-text("${text}")`,
  input: (placeholder: string) => `input[placeholder="${placeholder}"]`,
  label: (text: string) => `label:has-text("${text}") + input`,

  // Signup page
  signup: {
    fullNameInput: 'input[placeholder="John Doe"]',
    emailInput: 'input[type="email"]',
    passwordInput: 'input[type="password"]:first-of-type',
    confirmInput: 'input[type="password"]:last-of-type',
    submitButton: 'button:has-text("Create Admin Account")',
  },

  // Business Setup page
  businessSetup: {
    nameInput: 'input[placeholder="Elite Fleet Solutions"]',
    addressInput: 'input[placeholder="123 Fleet St, Sydney NSW 2000"]',
    phoneInput: 'input[placeholder="+61 400 000 000"]',
    submitButton: 'button:has-text("Complete Business Setup")',
  },

  // Fleet / Add Vehicle
  fleet: {
    addVehicleButton: 'button:has-text("Add Vehicle")',
    vinInput: '#vin',
    plateInput: '#plate',
    makeInput: '#make',
    modelInput: '#model',
    yearInput: '#year',
    colorInput: '#color',
    regoExpiryInput: '#regoExpiry',
    ctpExpiryInput: '#ctpExpiry',
    pinkSlipExpiryInput: '#pinkSlipExpiry',
    weeklyRateInput: '#weeklyRate',
    bondAmountInput: '#bondAmount',
    createVehicleButton: '[role="dialog"] button:has-text("Create Vehicle")',
  },

  // Drivers / Invite Driver
  drivers: {
    inviteButton: '#invite-driver-btn',
    emailInput: '#email',
    generateLinkButton: '[role="dialog"] button:has-text("Generate Link")',
    onboardingLinkInput: '[role="dialog"] input[readonly]',
    doneButton: '[role="dialog"] button:has-text("Done")',
    approveButton: (driverEmail: string) =>
      `[role="row"]:has-text("${driverEmail}") button[aria-label="Approve"]`,
    confirmApprovalButton: '[role="dialog"] button:has-text("Confirm Approval")',
  },

  // Onboarding page
  onboarding: {
    firstNameInput: 'input[placeholder="First name"]',
    lastNameInput: 'input[placeholder="Last name"]',
    phoneInput: 'input[placeholder="+61"]',
    addressInput: 'input[placeholder="Street address"]',
    licenseNumberInput: 'input[placeholder="License #"]',
    licenseExpiryInput: 'input[type="date"]',
    submitButton: 'button:has-text("Complete Onboarding")',
    successMessage: 'text=Application Submitted!',
  },

  // Rentals page
  rentals: {
    availableFleetTab: 'button[role="tab"]:has-text("Available Fleet")',
    activeContractsTab: 'button[role="tab"]:has-text("Active Contracts")',
    assignDriverButton: (vehiclePlate: string) =>
      `[role="card"]:has-text("${vehiclePlate}") button:has-text("Assign Driver")`,
    driverSelectDropdown: '[role="dialog"] select',
    createRentalButton: '[role="dialog"] button:has-text("Create Rental Contract")',
  },

  // Invoices page
  invoices: {
    generateInvoicesButton: 'button:has-text("Generate Invoices")',
    invoiceRow: (email: string) => `[role="row"]:has-text("${email}")`,
    markPaidButton: (invoiceId: string) =>
      `[data-invoice-id="${invoiceId}"] button[aria-label="Mark Paid"]`,
  },

  // Login page
  login: {
    emailInput: 'input[type="email"]',
    passwordInput: 'input[type="password"]',
    signInButton: 'button:has-text("Sign In")',
  },

  // Driver Dashboard
  driverDashboard: {
    paymentsTab: 'a[href*="payments"]',
    billingHistoryTab: 'button:has-text("Billing History")',
    invoiceTable: 'table',
    invoiceStatus: (status: string) => `text="${status}"`,
  },
};
