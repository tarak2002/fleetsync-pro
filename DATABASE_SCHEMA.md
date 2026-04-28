# FleetSync Pro - Database Schema Overview

**Project:** Supabase (ldyvkgyapjxyhjwsxanc)  
**Region:** AWS ap-southeast-2  
**Database:** PostgreSQL (postgres)

---

## 📊 Database Tables (13 total)

### 1. **businesses** 
Primary business management table for fleet operators.

```
Columns:
- id (UUID, Primary Key)
- name (String) - Business name
- abn (String, optional) - Australian Business Number
- address (String, optional)
- phone (String, optional)
- email (String, optional)
- is_active (Boolean, default: true)
- bank_name, bank_bsb, bank_account_number, bank_account_name (optional)
- admin_user_id, admin_name (optional)
- created_at, updated_at (Timestamps)

Relations:
→ users (many users per business)
→ vehicles (many vehicles per business)
→ drivers (many drivers per business)
→ vehicle_documents (many documents)
```

---

### 2. **users**
Authentication and user management.

```
Columns:
- id (UUID, Primary Key)
- email (String, Unique)
- name (String)
- role (Enum: ADMIN | DRIVER, default: DRIVER)
- business_id (UUID, Foreign Key, optional)
- created_at, updated_at (Timestamps)

Relations:
→ business (belongs to)
→ driver (one-to-one)
```

---

### 3. **drivers**
Driver profiles and compliance tracking.

```
Columns:
- id (UUID, Primary Key)
- user_id (UUID, Unique, optional)
- business_id (UUID, optional)
- name (String)
- email (String, Unique)
- phone (String, optional)
- license_no (String, Unique)
- license_expiry (DateTime, optional)
- passport_no (String, optional)
- vevo_status (Enum: PENDING | APPROVED | DENIED | RESTRICTED, default: PENDING)
- vevo_checked_at (DateTime, optional)
- status (Enum: PENDING_APPROVAL | ACTIVE | BLOCKED | INACTIVE, default: PENDING_APPROVAL)
- balance (Decimal 10,2, default: 0)
- passport_doc, license_doc (String, optional - S3 URLs)
- stripe_customer_id, stripe_payment_method_id (Unique, optional)
- created_at, updated_at (Timestamps)

Relations:
→ user (belongs to)
→ business (belongs to)
→ rentals (many rentals)
```

---

### 4. **vehicles**
Fleet vehicle inventory and compliance tracking.

```
Columns:
- id (UUID, Primary Key)
- business_id (UUID, optional)
- vin (String, Unique)
- plate (String, Unique)
- make (String)
- model (String)
- year (Int)
- color (String)
- status (Enum: DRAFT | AVAILABLE | RENTED | SUSPENDED, default: DRAFT)
- rego_expiry, ctp_expiry, pink_slip_expiry (DateTime)
- weekly_rate (Decimal 10,2)
- bond_amount (Decimal 10,2)
- insurance_cost (Decimal 10,2)
- rego_doc, ctp_doc, pink_slip_doc (String, optional - S3 URLs)
- created_at, updated_at (Timestamps)

Relations:
→ business (belongs to)
→ rentals (many)
→ alerts (many)
→ documents (many)
```

---

### 5. **vehicle_documents**
Document storage for vehicle compliance files.

```
Columns:
- id (UUID, Primary Key)
- vehicle_id (UUID, Foreign Key)
- business_id (UUID, Foreign Key)
- name (String)
- doc_type (String, default: "OTHER")
- file_url (String - S3 URL)
- file_name, file_size (optional)
- mime_type (String, optional)
- expiry_date (DateTime, optional)
- notes (String, optional)
- uploaded_by (String, optional - User ID)
- created_at, updated_at (Timestamps)

Relations:
→ vehicle (belongs to)
→ business (belongs to)
```

---

### 6. **rentals**
Active and historical vehicle rental records.

```
Columns:
- id (UUID, Primary Key)
- driver_id (UUID, Foreign Key)
- vehicle_id (UUID, Foreign Key)
- start_date (DateTime)
- end_date (DateTime, optional)
- bond_amount (Decimal 10,2)
- weekly_rate (Decimal 10,2)
- next_payment_date (DateTime)
- status (Enum: ACTIVE | COMPLETED | TERMINATED, default: ACTIVE)
- created_at, updated_at (Timestamps)

Relations:
→ driver (belongs to)
→ vehicle (belongs to)
→ invoices (many)
```

---

### 7. **invoices**
Weekly billing and payment tracking.

```
Columns:
- id (UUID, Primary Key)
- rental_id (UUID, Foreign Key)
- weekly_rate (Decimal 10,2)
- tolls (Decimal 10,2, default: 0)
- fines (Decimal 10,2, default: 0)
- credits (Decimal 10,2, default: 0)
- amount (Decimal 10,2) - Total invoice amount
- due_date (DateTime)
- paid_at (DateTime, optional)
- status (Enum: PENDING | PAID | OVERDUE, default: PENDING)
- stripe_payment_intent_id (String, Unique, optional)
- created_at, updated_at (Timestamps)

Relations:
→ rental (belongs to)
→ toll_charges (many)
```

---

### 8. **toll_charges**
Toll transaction tracking from toll providers.

```
Columns:
- id (UUID, Primary Key)
- invoice_id (UUID, Foreign Key, optional)
- plate (String)
- date (DateTime)
- amount (Decimal 10,2)
- location (String, optional)
- provider_tx_id (String, Unique, optional - External provider ID)
- created_at (Timestamp)

Relations:
→ invoice (belongs to, optional)
```

---

### 9. **alerts**
Compliance and maintenance alerts system.

```
Columns:
- id (UUID, Primary Key)
- type (Enum: REGO_EXPIRY | CTP_EXPIRY | PINK_SLIP_EXPIRY | VEVO_ISSUE | PAYMENT_OVERDUE)
- message (String)
- vehicle_id (UUID, optional)
- driver_id (UUID, optional)
- resolved (Boolean, default: false)
- resolved_at (DateTime, optional)
- created_at (Timestamp)

Relations:
→ vehicle (belongs to, optional)
```

---

### 10. **onboarding_tokens**
One-time onboarding links for new drivers.

```
Columns:
- id (UUID, Primary Key)
- token (String, Unique)
- email (String)
- expires_at (DateTime)
- used (Boolean, default: false)
- used_at (DateTime, optional)
- created_at (Timestamp)

Uses:
- Email-based driver onboarding
- Secure token validation
- Prevents duplicate onboarding
```

---

### 11. **earnings_records**
Argyle gig-economy earnings integration.

```
Columns:
- id (UUID, Primary Key)
- driver_id (String, Foreign Key)
- week_starting (DateTime)
- gross_earnings (Decimal 10,2)
- net_earnings (Decimal 10,2)
- trips (Int)
- platform (String, default: "uber")
- created_at (Timestamp)

Unique Constraint: (driver_id, week_starting, platform)

Uses:
- Track driver earnings from gig platforms
- Weekly earnings reports
- Tax reporting
```

---

### 12. **shifts**
Driver shift management and tracking.

```
Columns:
- id (UUID, Primary Key)
- rental_id (String, Foreign Key)
- driver_id (String, Foreign Key)
- status (Enum: NOT_STARTED | ACTIVE | ENDED, default: NOT_STARTED)
- started_at (DateTime, optional)
- ended_at (DateTime, optional)
- created_at, updated_at (Timestamps)

Relations:
→ rental (belongs to)
→ condition_report (one-to-one)

Uses:
- Track active driving shifts
- Start/end shift timestamps
- Link to vehicle condition reports
```

---

### 13. **condition_reports**
Vehicle condition documentation at shift start/end.

```
Columns:
- id (UUID, Primary Key)
- shift_id (String, Unique, Foreign Key)
- vehicle_id (String, Foreign Key)
- driver_id (String, Foreign Key)
- damage_markers (String, optional - JSON)
- notes (String, optional)
- photos (String[], optional - Array of S3 URLs)
- verified_at (DateTime, default: now())
- created_at (Timestamp)

Relations:
→ shift (belongs to, one-to-one)

Uses:
- Document vehicle condition before/after rental
- Track damage and wear
- Photo evidence of vehicle state
```

---

## 🔑 Key Relationships

```
Business
  ├── Users (1-to-many)
  │   └── Driver (1-to-1)
  ├── Drivers (1-to-many)
  │   └── Rentals (1-to-many)
  │       └── Invoices (1-to-many)
  │           └── TollCharges (1-to-many)
  └── Vehicles (1-to-many)
      ├── Rentals (1-to-many)
      └── Documents (1-to-many)
      └── Alerts (1-to-many)
```

---

## 💾 Enums

| Enum | Values |
|------|--------|
| **VehicleStatus** | DRAFT, AVAILABLE, RENTED, SUSPENDED |
| **VevoStatus** | PENDING, APPROVED, DENIED, RESTRICTED |
| **DriverStatus** | PENDING_APPROVAL, ACTIVE, BLOCKED, INACTIVE |
| **RentalStatus** | ACTIVE, COMPLETED, TERMINATED |
| **InvoiceStatus** | PENDING, PAID, OVERDUE |
| **AlertType** | REGO_EXPIRY, CTP_EXPIRY, PINK_SLIP_EXPIRY, VEVO_ISSUE, PAYMENT_OVERDUE |
| **UserRole** | ADMIN, DRIVER |
| **ShiftStatus** | NOT_STARTED, ACTIVE, ENDED |

---

## 🚀 How to Query the Database

### From Your Application:
```typescript
// Using Prisma Client
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get all businesses
const businesses = await prisma.business.findMany();

// Get driver with rentals
const driver = await prisma.driver.findUnique({
  where: { id: 'driver-id' },
  include: { rentals: true }
});

// Get active rentals with invoices
const activeRentals = await prisma.rental.findMany({
  where: { status: 'ACTIVE' },
  include: { 
    driver: true,
    vehicle: true,
    invoices: true
  }
});
```

### From Supabase Dashboard:
1. Log in to https://app.supabase.com
2. Select your project (ldyvkgyapjxyhjwsxanc)
3. Go to "SQL Editor"
4. Use the SQL queries directly

---

## 📈 Data Summary

**Total Tables:** 13  
**Relationships:** Multi-tenant (business-scoped)  
**Key Integrations:**
- 🔐 Supabase Auth (users)
- 💳 Stripe (invoices, payment methods)
- 🛣️ Toll Provider APIs (toll_charges)
- ✅ VEVO (visa verification - drivers)
- 💼 Argyle (gig economy earnings)

---

## ⚠️ Important Notes

1. **Multi-Tenant:** All data is scoped to `business_id`
2. **Encryption:** Sensitive data (payment methods, documents) stored as S3 URLs
3. **Compliance:** Tracks vehicle expiries and driver license status
4. **Audit Trail:** All tables have `created_at` and `updated_at` timestamps
5. **Foreign Keys:** Properly configured with cascading rules

---

**Last Updated:** April 28, 2026  
**Generated from:** prisma/schema.prisma
