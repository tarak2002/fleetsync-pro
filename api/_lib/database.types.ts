// Auto-generated TypeScript types for FleetSync Pro Supabase schema

export type VehicleStatus = 'DRAFT' | 'AVAILABLE' | 'RENTED' | 'SUSPENDED';
export type VevoStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'RESTRICTED';
export type DriverStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'BLOCKED' | 'INACTIVE';
export type RentalStatus = 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE';
export type AlertType = 'REGO_EXPIRY' | 'CTP_EXPIRY' | 'PINK_SLIP_EXPIRY' | 'VEVO_ISSUE' | 'PAYMENT_OVERDUE';
export type UserRole = 'ADMIN' | 'DRIVER';
export type ShiftStatus = 'NOT_STARTED' | 'ACTIVE' | 'ENDED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  vin: string;
  plate: string;
  make: string;
  model: string;
  year: number;
  color: string;
  status: VehicleStatus;
  rego_expiry: string;
  ctp_expiry: string;
  pink_slip_expiry: string;
  weekly_rate: number;
  bond_amount: number;
  insurance_cost: number;
  rego_doc: string | null;
  ctp_doc: string | null;
  pink_slip_doc: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  license_no: string;
  license_expiry: string | null;
  passport_no: string | null;
  vevo_status: VevoStatus;
  vevo_checked_at: string | null;
  status: DriverStatus;
  balance: number;
  passport_doc: string | null;
  license_doc: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rental {
  id: string;
  driver_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string | null;
  bond_amount: number;
  weekly_rate: number;
  next_payment_date: string;
  status: RentalStatus;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  rental_id: string;
  weekly_rate: number;
  tolls: number;
  fines: number;
  credits: number;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: InvoiceStatus;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TollCharge {
  id: string;
  invoice_id: string | null;
  plate: string;
  date: string;
  amount: number;
  location: string | null;
  provider_tx_id: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  vehicle_id: string | null;
  driver_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface OnboardingToken {
  id: string;
  token: string;
  email: string;
  expires_at: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

export interface EarningsRecord {
  id: string;
  driver_id: string;
  week_starting: string;
  gross_earnings: number;
  net_earnings: number;
  trips: number;
  platform: string;
  created_at: string;
}

export interface Shift {
  id: string;
  rental_id: string;
  driver_id: string;
  status: ShiftStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConditionReport {
  id: string;
  shift_id: string;
  vehicle_id: string;
  driver_id: string;
  damage_markers: string | null;
  notes: string | null;
  photos: string[];
  verified_at: string;
  created_at: string;
}

export interface AccidentReport {
  id: string;
  rental_id: string;
  driver_id: string;
  vehicle_id: string;
  is_safe: boolean;
  emergency_called: boolean;
  scene_photos: string[];
  third_party_name: string | null;
  third_party_phone: string | null;
  third_party_plate: string | null;
  third_party_insurer: string | null;
  description: string | null;
  location: string | null;
  occurred_at: string;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// Join types (with eager-loaded relations)
export interface VehicleWithRelations extends Vehicle {
  rentals?: (Rental & { driver?: Driver })[];
}

export interface DriverWithRelations extends Driver {
  user?: User | null;
  rentals?: (Rental & { vehicle?: Vehicle; invoices?: Invoice[] })[];
}

export interface RentalWithRelations extends Rental {
  driver?: Driver;
  vehicle?: Vehicle;
  invoices?: Invoice[];
}

export interface InvoiceWithRelations extends Invoice {
  rental?: RentalWithRelations;
  toll_charges?: TollCharge[];
}
