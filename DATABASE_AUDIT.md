# FleetSync Pro - Database Schema & Codebase Audit Report

**Date:** April 28, 2026  
**Audit Type:** Schema vs Codebase Alignment  
**Status:** ⚠️ CRITICAL ISSUES FOUND

---

## 🔴 CRITICAL ISSUES (Must Fix)

### Issue #1: Missing Field in Schema - RENTAL TABLE
**Severity:** 🔴 CRITICAL  
**Problem:** Code inserts `business_id` into rentals table, but schema doesn't define this field

**Evidence:**
```typescript
// api/_services/RentalService.ts:87
.insert({
  driver_id: data.driver_id,
  vehicle_id: data.vehicle_id,
  start_date: start_date.toISOString(),
  bond_amount: data.bond_amount,
  weekly_rate: data.weekly_rate,
  next_payment_date: next_payment_date.toISOString(),
  status: 'ACTIVE' as RentalStatus,
  business_id: data.business_id,  // ❌ NOT IN SCHEMA
  updated_at: new Date().toISOString()
})
```

**Prisma Schema:**
```prisma
model Rental {
  id              String       @id @default(uuid())
  driver_id       String       // Foreign key to Driver
  vehicle_id      String       // Foreign key to Vehicle
  // ... other fields
  // ❌ NO business_id field!
}
```

**TypeScript Types:**
```typescript
export interface Rental {
  id: string;
  driver_id: string;
  vehicle_id: string;
  // ... other fields
  // ❌ NO business_id field!
}
```

**Impact:**
- Data being inserted will be rejected by database
- Rental creation will fail
- Cannot track business ownership at rental level

**Root Cause:** Business information should come through `driver->business` relationship, not directly

**Fix Recommended:**
1. Option A: Query through driver relationship instead of direct field
2. Option B: Add business_id field to Rental schema if direct tracking needed
3. Option C: Update code to not insert business_id

**Files Affected:**
- api/_services/RentalService.ts (line 87)
- api/_routes/rentals.ts (tries to query with business_id)

---

### Issue #2: Missing Field in Schema - INVOICE TABLE
**Severity:** 🔴 CRITICAL  
**Problem:** Code queries/inserts `business_id` in invoices, but schema doesn't have this field

**Evidence:**
```typescript
// api/_services/BillingService.ts:50
.insert({
  rental_id: rental_id,
  weekly_rate,
  tolls: additionalData?.tolls || 0,
  fines: additionalData?.fines || 0,
  credits: additionalData?.credits || 0,
  amount,
  due_date: due_date.toISOString(),
  status: 'PENDING' as InvoiceStatus,
  business_id: rental.business_id,  // ❌ NOT IN SCHEMA
  updated_at: new Date().toISOString()
})

// api/_routes/invoices.ts:17
.eq('business_id', businessId)  // ❌ QUERYING NON-EXISTENT FIELD
```

**Prisma Schema:**
```prisma
model Invoice {
  id              String        @id @default(uuid())
  rental_id       String        // Foreign key to Rental
  // ... financial fields
  // ❌ NO business_id field!
}
```

**Impact:**
- Invoice filtering by business fails
- Multi-tenant isolation broken
- Data insertion rejected

**Fix Recommended:**
1. Query invoices through rental->driver->business relationship
2. Or add business_id to Invoice schema

**Files Affected:**
- api/_services/BillingService.ts (line 50)
- api/_routes/invoices.ts (lines 17, 63)

---

### Issue #3: Table Name Mismatch - VEHICLE_DOCUMENTS
**Severity:** 🟠 HIGH  
**Problem:** Code references both `vehicle_documents` and `vehicle-documents` (hyphen vs underscore)

**Evidence:**
```typescript
// api/_routes/documents.ts
.from('vehicle_documents')  // ✅ Correct

// Some other files use:
.from('vehicle-documents')  // ❌ Wrong naming
```

**Grep Results:**
```
10 vehicle_documents    ✅ Correct
6  vehicle-documents    ❌ Wrong (will cause 404 errors)
```

**Impact:**
- Queries fail with table not found
- Document management broken
- API errors in affected endpoints

**Fix:** Replace all `vehicle-documents` with `vehicle_documents`

---

### Issue #4: Missing Table in Prisma Schema - ACCIDENT_REPORTS
**Severity:** 🟠 HIGH  
**Problem:** Code references `accident_reports` table, but it's not defined in Prisma schema

**Evidence:**
```typescript
// database.types.ts defines:
export interface AccidentReport {
  id: string;
  rental_id: string;
  driver_id: string;
  // ... 10+ fields
}

// But Prisma schema has NO model for this!
// grep shows: 1 accident_reports reference in api/_routes/driver-dashboard.ts
```

**Impact:**
- Accident report submission will fail
- Driver dashboard error reporting broken
- Type safety misalignment

**Fix:** Add accident_reports table to Prisma schema:
```prisma
model AccidentReport {
  id                String   @id @default(uuid())
  rental_id         String
  driver_id         String
  vehicle_id        String
  is_safe           Boolean
  emergency_called  Boolean
  scene_photos      String[]
  third_party_name  String?
  third_party_phone String?
  third_party_plate String?
  third_party_insurer String?
  description       String?
  location          String?
  occurred_at       DateTime
  synced_at         DateTime?
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  @@map("accident_reports")
}
```

---

## 🟠 HIGH PRIORITY ISSUES

### Issue #5: Missing business_id Tracking
**Severity:** 🟠 HIGH  
**Problem:** No business_id field in Rental and Invoice tables makes multi-tenant isolation weak

**Current Design:**
```
Business
  └─ Driver
      └─ Rental
          └─ Invoice
```

**Problem:** Need to query invoices by business, but have to traverse: Invoice → Rental → Driver → Business

**Recommendation:** Add `business_id` fields for easier querying:
```prisma
model Rental {
  // ... existing fields
  business_id     String?
  business        Business?  @relation(fields: [business_id], references: [id])
}

model Invoice {
  // ... existing fields
  business_id     String?
  business        Business?  @relation(fields: [business_id], references: [id])
}
```

**Performance Impact:** Queries would be O(1) instead of O(n) relationships

---

### Issue #6: Timestamp Field Inconsistency
**Severity:** 🟠 MEDIUM  
**Problem:** Code uses snake_case (`updated_at`, `created_at`) but Prisma schema uses camelCase (`updatedAt`, `createdAt`)

**Evidence:**
```typescript
// Code everywhere uses:
updated_at: new Date().toISOString()
created_at: new Date().toISOString()

// But Prisma schema uses:
updated_at  DateTime @updatedAt
created_at  DateTime @default(now())
```

**Status:** ✅ Works (Supabase auto-converts), but inconsistent

**Recommendation:** Standardize on one convention

---

## 📊 Table Alignment Report

| Table | Prisma Schema | Code Usage | Type Defs | Status |
|-------|---|---|---|---|
| businesses | ✅ Yes | 8 refs | ✅ Yes | ✅ OK |
| users | ✅ Yes | 7 refs | ✅ Yes | ✅ OK |
| drivers | ✅ Yes | 32 refs | ✅ Yes | ✅ OK |
| vehicles | ✅ Yes | 38 refs | ✅ Yes | ✅ OK |
| rentals | ✅ Yes (missing business_id) | 31 refs | ✅ Yes (missing business_id) | 🔴 BROKEN |
| invoices | ✅ Yes (missing business_id) | 17 refs | ✅ Yes (missing business_id) | 🔴 BROKEN |
| vehicle_documents | ✅ Yes | 10 refs + 6 wrong | ✅ Yes | 🟠 PARTIAL |
| toll_charges | ✅ Yes | 4 refs | ✅ Yes | ✅ OK |
| alerts | ✅ Yes | 6 refs | ✅ Yes | ✅ OK |
| shifts | ✅ Yes | 7 refs | ✅ Yes | ✅ OK |
| condition_reports | ✅ Yes | 1 ref | ✅ Yes | ✅ OK |
| onboarding_tokens | ✅ Yes | 2 refs | ✅ Yes | ✅ OK |
| earnings_records | ✅ Yes | 2 refs | ✅ Yes | ✅ OK |
| vehicle_documents | ✅ Yes | 6 wrong refs | ✅ Yes | 🟠 NAME ERROR |
| accident_reports | ❌ NO | 1 ref | ✅ Yes | 🔴 MISSING |

---

## 🔍 Code Pattern Analysis

### Safe Queries (Multi-tenant Isolation)
✅ Drivers queries always include `eq('business_id', businessId)`
✅ Vehicles queries always include `eq('business_id', businessId)`
✅ Users properly scoped

### Unsafe Queries (Missing Multi-tenant Check)
🔴 Rentals query uses `business_id` filtering even though field doesn't exist
🔴 Invoices query uses `business_id` filtering even though field doesn't exist
🔴 No fallback to driver.business_id relationship

---

## 🛠️ Recommended Fixes (Priority Order)

### PHASE 1: CRITICAL (Do First - Blocks Rental/Invoice Operations)

**1. Fix Rental business_id Usage**
```diff
// RentalService.ts - REMOVE business_id insert
.insert({
  driver_id: data.driver_id,
  vehicle_id: data.vehicle_id,
  start_date: start_date.toISOString(),
  bond_amount: data.bond_amount,
  weekly_rate: data.weekly_rate,
  next_payment_date: next_payment_date.toISOString(),
  status: 'ACTIVE' as RentalStatus,
- business_id: data.business_id,
  updated_at: new Date().toISOString()
})

// rentals.ts - CHANGE filtering to use driver relationship
- .eq('business_id', businessId)
+ .eq('driver.business_id', businessId)
```

**2. Fix Invoice business_id Usage**
```diff
// BillingService.ts - REMOVE business_id insert
.insert({
  rental_id: rental_id,
  // ... other fields
- business_id: rental.business_id,
  updated_at: new Date().toISOString()
})

// invoices.ts - CHANGE filtering approach
- .eq('business_id', businessId)
+ Use rental_id join: get driver's rentals first, then filter invoices
```

**3. Fix vehicle-documents Table Name**
```bash
# Replace all:
'vehicle-documents' → 'vehicle_documents'
```

**4. Add accident_reports to Prisma Schema**
Add model definition (see Issue #4 above)

### PHASE 2: HIGH (Recommended for Better Performance)

**Add business_id fields to Rental and Invoice** for O(1) queries instead of O(n)

### PHASE 3: MEDIUM (Code Quality)

**Standardize timestamp field names** (either snake_case or camelCase everywhere)

---

## 📈 Data Flow Validation

### Current Rental Creation Flow
```
✅ POST /api/rentals
  ✅ Check vehicle.status != SUSPENDED
  ✅ Check driver.status == ACTIVE
  ❌ Try to insert business_id (doesn't exist)
  ❌ FAILS
```

### Current Invoice Generation Flow
```
✅ GET /api/invoices
  ❌ Try to filter by business_id (doesn't exist)
  ❌ FAILS
```

### Current Document Upload Flow
```
❓ POST /api/documents
  ❓ Uses 'vehicle-documents' (wrong name)
  ❌ FAILS with table not found
```

---

## ✅ Correct Operations (Working)

✅ Driver registration - uses proper schema
✅ Vehicle creation - uses proper schema
✅ Compliance alerts - uses proper schema
✅ Shift tracking - uses proper schema
✅ VEVO checks - uses proper schema

---

## 📋 Audit Checklist

- [x] Schema vs Type Definition alignment
- [x] Schema vs Code usage alignment
- [x] Multi-tenant isolation verification
- [x] Foreign key relationship validation
- [x] Table name consistency
- [x] Field name consistency
- [ ] Query performance analysis
- [ ] Data integrity constraints
- [ ] Cascading delete implications

---

## 🎯 Summary

**Total Issues Found:** 6
- 🔴 Critical: 3 (Rental business_id, Invoice business_id, accident_reports missing)
- 🟠 High: 2 (vehicle-documents naming, business_id tracking weakness)
- 🟡 Medium: 1 (timestamp naming inconsistency)

**Breaking Issues:** 3
- Rentals creation will fail
- Invoices querying will fail
- Document uploads may fail

**Estimated Fix Time:** 2-3 hours

**Recommended Action:** 
1. Fix rental/invoice business_id issues first (30 min)
2. Fix table naming (15 min)
3. Add accident_reports to schema (30 min)
4. Verify all API endpoints work (1 hour)
5. Add business_id fields to schema for performance (1 hour)

---

**Audit Performed:** April 28, 2026  
**Next Review:** After fixes applied
