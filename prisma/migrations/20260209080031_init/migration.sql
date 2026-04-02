-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'RENTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VevoStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'BLOCKED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('REGO_EXPIRY', 'CTP_EXPIRY', 'PINK_SLIP_EXPIRY', 'VEVO_ISSUE', 'PAYMENT_OVERDUE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DRIVER');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('NOT_STARTED', 'ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DRIVER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'DRAFT',
    "rego_expiry" TIMESTAMP(3) NOT NULL,
    "ctp_expiry" TIMESTAMP(3) NOT NULL,
    "pink_slip_expiry" TIMESTAMP(3) NOT NULL,
    "weekly_rate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "bond_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "license_no" TEXT NOT NULL,
    "license_expiry" TIMESTAMP(3),
    "passport_no" TEXT,
    "vevo_status" "VevoStatus" NOT NULL DEFAULT 'PENDING',
    "vevo_checked_at" TIMESTAMP(3),
    "status" "DriverStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "passport_doc" TEXT,
    "license_doc" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentals" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "bond_amount" DECIMAL(10,2) NOT NULL,
    "weekly_rate" DECIMAL(10,2) NOT NULL,
    "next_payment_date" TIMESTAMP(3) NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "weekly_rate" DECIMAL(10,2) NOT NULL,
    "tolls" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fines" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "credits" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(10,2) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toll_charges" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "plate" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "toll_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "message" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "driver_id" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings_records" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "week_starting" TIMESTAMP(3) NOT NULL,
    "gross_earnings" DECIMAL(10,2) NOT NULL,
    "net_earnings" DECIMAL(10,2) NOT NULL,
    "trips" INTEGER NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'uber',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earnings_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condition_reports" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "damage_markers" TEXT,
    "notes" TEXT,
    "photos" TEXT[],
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "condition_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accident_reports" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "is_safe" BOOLEAN NOT NULL DEFAULT true,
    "emergency_called" BOOLEAN NOT NULL DEFAULT false,
    "scene_photos" TEXT[],
    "third_party_name" TEXT,
    "third_party_phone" TEXT,
    "third_party_plate" TEXT,
    "third_party_insurer" TEXT,
    "description" TEXT,
    "location" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accident_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_key" ON "vehicles"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_no_key" ON "drivers"("license_no");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_tokens_token_key" ON "onboarding_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "earnings_records_driver_id_week_starting_platform_key" ON "earnings_records"("driver_id", "week_starting", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "condition_reports_shift_id_key" ON "condition_reports"("shift_id");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings_records" ADD CONSTRAINT "earnings_records_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_reports" ADD CONSTRAINT "condition_reports_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_reports" ADD CONSTRAINT "condition_reports_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_reports" ADD CONSTRAINT "accident_reports_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_reports" ADD CONSTRAINT "accident_reports_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accident_reports" ADD CONSTRAINT "accident_reports_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toll_charges" ADD CONSTRAINT "toll_charges_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condition_reports" ADD CONSTRAINT "condition_reports_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
