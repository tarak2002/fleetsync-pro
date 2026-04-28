# Graph Report - .  (2026-04-24)

## Corpus Check
- 121 files · ~353,758 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 246 nodes · 293 edges · 56 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.8)
- Token cost: 12,000 input · 450 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Authentication & Security|Authentication & Security]]
- [[_COMMUNITY_Billing & Payments|Billing & Payments]]
- [[_COMMUNITY_Authentication & Security|Authentication & Security]]
- [[_COMMUNITY_Billing & Payments|Billing & Payments]]
- [[_COMMUNITY_Compliance & Risk|Compliance & Risk]]
- [[_COMMUNITY_Billing & Payments|Billing & Payments]]
- [[_COMMUNITY_Background Jobs|Background Jobs]]
- [[_COMMUNITY_Authentication & Security|Authentication & Security]]
- [[_COMMUNITY_Fleet Management|Fleet Management]]
- [[_COMMUNITY_Compliance & Risk|Compliance & Risk]]
- [[_COMMUNITY_Driver Management|Driver Management]]
- [[_COMMUNITY_Driver Management|Driver Management]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_Driver Management|Driver Management]]
- [[_COMMUNITY_Billing & Payments|Billing & Payments]]
- [[_COMMUNITY_Driver Management|Driver Management]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Fleet Management|Fleet Management]]
- [[_COMMUNITY_Reporting & Incidents|Reporting & Incidents]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Utilities & Formatting|Utilities & Formatting]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Background Jobs|Background Jobs]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Driver Management|Driver Management]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_API Infrastructure|API Infrastructure]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Background Jobs|Background Jobs]]
- [[_COMMUNITY_Compliance & Risk|Compliance & Risk]]
- [[_COMMUNITY_Fleet Management|Fleet Management]]

## God Nodes (most connected - your core abstractions)
1. `DriverService` - 8 edges
2. `VehicleService` - 7 edges
3. `BillingService` - 6 edges
4. `ComplianceService` - 5 edges
5. `RentalService` - 5 edges
6. `StripeService` - 5 edges
7. `VevoService` - 5 edges
8. `TollService` - 4 edges
9. `UberMockService` - 4 edges
10. `provisionUser()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `runCheck()` --calls--> `check()`  [INFERRED]
  src\pages\Compliance.tsx → api\_routes\compliance.ts
- `Security Audit Report` --rationale_for--> `Multi-Tenancy Hardening`  [EXTRACTED]
  SECURITY_AUDIT.md → changes.md

## Communities

### Community 0 - "Authentication & Security"
Cohesion: 0.15
Nodes (0): 

### Community 1 - "Billing & Payments"
Cohesion: 0.11
Nodes (5): handler(), BillingService, DriverService, RentalService, VevoService

### Community 2 - "Authentication & Security"
Cohesion: 0.13
Nodes (5): fetchBusinesses(), handleDelete(), handleSubmit(), run(), VehicleService

### Community 3 - "Billing & Payments"
Cohesion: 0.19
Nodes (4): handleEndShift(), handleReturnVehicle(), handleStartShift(), loadDashboard()

### Community 4 - "Compliance & Risk"
Cohesion: 0.2
Nodes (6): check(), handler(), loadData(), resolveAlert(), runCheck(), ComplianceService

### Community 5 - "Billing & Payments"
Cohesion: 0.21
Nodes (6): handleMarkPaid(), loadInvoices(), handleAssign(), handleEndRental(), loadData(), loadTolls()

### Community 6 - "Background Jobs"
Cohesion: 0.24
Nodes (3): handler(), TollService, verifyTollLogic()

### Community 7 - "Authentication & Security"
Cohesion: 0.24
Nodes (4): main(), provisionUser(), main(), StripeService

### Community 8 - "Fleet Management"
Cohesion: 0.22
Nodes (2): getDefaultExpiry(), handleSubmit()

### Community 9 - "Compliance & Risk"
Cohesion: 0.29
Nodes (0): 

### Community 10 - "Driver Management"
Cohesion: 0.29
Nodes (0): 

### Community 11 - "Driver Management"
Cohesion: 0.4
Nodes (1): UberMockService

### Community 12 - "UI Components"
Cohesion: 0.4
Nodes (1): ErrorBoundary

### Community 13 - "Driver Management"
Cohesion: 0.5
Nodes (0): 

### Community 14 - "Billing & Payments"
Cohesion: 0.5
Nodes (0): 

### Community 15 - "Driver Management"
Cohesion: 0.5
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (0): 

### Community 17 - "Fleet Management"
Cohesion: 0.5
Nodes (0): 

### Community 18 - "Reporting & Incidents"
Cohesion: 0.5
Nodes (4): Business ID Enforcement, IDOR Vulnerabilities, Multi-Tenancy Hardening, Security Audit Report

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (0): 

### Community 21 - "Utilities & Formatting"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Background Jobs"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Driver Management"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "UI Components"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "API Infrastructure"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "UI Components"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Atomic Financial Operations

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Stripe Webhook Verification

### Community 53 - "Background Jobs"
Cohesion: 1.0
Nodes (1): Argyle Financial Sync

### Community 54 - "Compliance & Risk"
Cohesion: 1.0
Nodes (1): VEVO Visa Compliance

### Community 55 - "Fleet Management"
Cohesion: 1.0
Nodes (1): FleetSync Pro Architecture

## Knowledge Gaps
- **7 isolated node(s):** `IDOR Vulnerabilities`, `Business ID Enforcement`, `Atomic Financial Operations`, `Stripe Webhook Verification`, `Argyle Financial Sync` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 22`** (2 nodes): `jwt.ts`, `getJwtSecret()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `prisma.ts`, `prismaClientSingleton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Background Jobs`** (2 nodes): `syncTolls()`, `linkt-sync.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `App.tsx`, `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `LoadingScreen()`, `LoadingScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Driver Management`** (2 nodes): `handleLogout()`, `DriverLayout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `handleLogout()`, `Layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `handleSubmit()`, `PaymentForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `StripeWrapper.tsx`, `StripeWrapper()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `Badge()`, `badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `handleSubmit()`, `BusinessSetup.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `MapController()`, `LiveTracking.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Components`** (2 nodes): `SignupPage()`, `Signup.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `dialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `label.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `select.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Infrastructure`** (1 nodes): `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `supabase.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Dashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Components`** (1 nodes): `LandingPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `PaymentStatus.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Atomic Financial Operations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Stripe Webhook Verification`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Background Jobs`** (1 nodes): `Argyle Financial Sync`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Compliance & Risk`** (1 nodes): `VEVO Visa Compliance`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fleet Management`** (1 nodes): `FleetSync Pro Architecture`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DriverService` connect `Billing & Payments` to `Authentication & Security`, `Billing & Payments`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `VehicleService` connect `Authentication & Security` to `Billing & Payments`, `Authentication & Security`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `handleSubmit()` connect `Fleet Management` to `Authentication & Security`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `IDOR Vulnerabilities`, `Business ID Enforcement`, `Atomic Financial Operations` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Billing & Payments` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Authentication & Security` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._