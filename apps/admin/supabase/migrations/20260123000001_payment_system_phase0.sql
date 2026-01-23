-- ============================================================
-- PAYMENT SYSTEM MIGRATION - PHASE 0: CRITICAL FOUNDATION
-- ============================================================
-- This migration creates the core payment system infrastructure
-- following K-12 school auditor recommendations.
--
-- Includes:
-- 1. Core payment tables (fee categories, structures, accounts)
-- 2. Family/sibling tracking for discounts
-- 3. BIR-compliant OR number series
-- 4. Optimistic locking for race condition prevention
-- 5. Audit logging for all financial operations
-- ============================================================

-- ============================================================
-- PART 1: ADD ENROLLMENT STATUS TO STUDENTS (Critical Fix #1)
-- ============================================================
-- This allows us to control system access based on payment status

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'students'
    AND column_name = 'enrollment_status'
  ) THEN
    ALTER TABLE public.students
    ADD COLUMN enrollment_status TEXT DEFAULT 'approved'
    CHECK (enrollment_status IN (
      'pending',        -- Application submitted, not yet approved
      'approved',       -- Approved but fees not assessed
      'assessed',       -- Fees assessed, awaiting payment
      'partial_paid',   -- Some payment received
      'fully_paid',     -- All fees paid for current period
      'on_hold',        -- Account restricted due to non-payment
      'withdrawn',      -- Student withdrew
      'graduated'       -- Student graduated
    ));

    COMMENT ON COLUMN public.students.enrollment_status IS
      'Payment-aware enrollment status. Controls system access.';
  END IF;
END $$;

-- ============================================================
-- PART 2: SCHOOL YEARS TABLE (Academic Year Management)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,

  year_code TEXT NOT NULL,                    -- '2025-2026'
  year_name TEXT NOT NULL,                    -- 'School Year 2025-2026'

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Enrollment periods
  enrollment_start DATE,
  enrollment_end DATE,
  late_enrollment_end DATE,

  -- Status
  status TEXT DEFAULT 'upcoming' CHECK (status IN (
    'upcoming',    -- Not yet started
    'active',      -- Current school year
    'closed',      -- Ended, no more changes
    'archived'     -- Historical record
  )),

  -- Financial settings
  carry_forward_unpaid_balance BOOLEAN DEFAULT true,
  late_enrollment_fee DECIMAL(12,2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.school_profiles(id),

  UNIQUE(school_id, year_code)
);

CREATE INDEX IF NOT EXISTS idx_school_years_active
  ON public.school_years(school_id, status) WHERE status = 'active';

COMMENT ON TABLE public.school_years IS
  'Academic year definitions with enrollment periods and financial settings';

-- ============================================================
-- PART 3: FAMILY GROUPS (Sibling Discount Tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,

  family_name TEXT NOT NULL,                  -- 'Santos Family'
  family_code TEXT,                           -- 'FAM-2025-00001' for reference

  -- Primary contact
  primary_guardian_id UUID REFERENCES public.school_profiles(id),

  -- Discount configuration
  sibling_discount_enabled BOOLEAN DEFAULT true,
  custom_discount_percentage DECIMAL(5,2),    -- Override default sibling discount

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.school_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_family_groups_school
  ON public.family_groups(school_id);

COMMENT ON TABLE public.family_groups IS
  'Groups siblings together for discount calculations and combined statements';

-- ============================================================
-- PART 3B: SIBLING DISCOUNTS (Configurable Discount Tiers)
-- ============================================================
-- Example: 2nd child = 10%, 3rd child = 15%, 4th+ child = 20%

CREATE TABLE IF NOT EXISTS public.sibling_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,

  -- Tier configuration
  sibling_order_from INTEGER NOT NULL,        -- 2 = applies from 2nd child
  sibling_order_to INTEGER,                   -- NULL = unlimited (2nd child onwards)

  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_percentage DECIMAL(5,2),           -- e.g., 10.00 for 10%
  discount_amount DECIMAL(12,2),              -- Fixed amount if discount_type = 'fixed'

  applies_to TEXT DEFAULT 'tuition' CHECK (applies_to IN ('tuition', 'all')),

  description TEXT,                           -- '2nd Child Discount'
  is_active BOOLEAN DEFAULT true,

  -- If family_group_id is NULL, this is a school-wide default
  -- If family_group_id is set, this overrides the default for that family

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sibling_discounts_school
  ON public.sibling_discounts(school_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sibling_discounts_family
  ON public.sibling_discounts(family_group_id) WHERE family_group_id IS NOT NULL;

COMMENT ON TABLE public.sibling_discounts IS
  'Configurable sibling discount tiers. Can be school-wide defaults or family-specific overrides.';

-- ============================================================
-- PART 4: FAMILY MEMBERS (Link Students to Families)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  relationship TEXT DEFAULT 'sibling',        -- 'sibling', 'twin'
  enrollment_order INTEGER,                   -- 1 = first enrolled, 2 = second, etc.

  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,                        -- If student leaves family group
  left_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(family_group_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_student
  ON public.family_members(student_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family
  ON public.family_members(family_group_id) WHERE is_active = true;

COMMENT ON TABLE public.family_members IS
  'Links students to family groups for sibling discount calculations';

-- ============================================================
-- PART 5: STUDENT GUARDIANS (Multiple Guardians per Student)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_profile_id UUID REFERENCES public.school_profiles(id),

  -- Guardian info (if not in school_profiles)
  guardian_name TEXT NOT NULL,
  guardian_email TEXT,
  guardian_phone TEXT,

  relationship TEXT NOT NULL,                 -- 'mother', 'father', 'guardian', 'grandparent'

  -- Permissions
  is_primary BOOLEAN DEFAULT false,
  is_emergency_contact BOOLEAN DEFAULT true,
  can_pickup BOOLEAN DEFAULT true,

  -- Financial responsibility
  financial_responsibility BOOLEAN DEFAULT true,
  billing_percentage DECIMAL(5,2) DEFAULT 100, -- 50 for 50/50 split
  responsible_fee_categories TEXT[],          -- ['tuition'] or NULL for all

  -- Communication preferences
  receives_billing BOOLEAN DEFAULT true,
  receives_academic_reports BOOLEAN DEFAULT true,
  receives_notifications BOOLEAN DEFAULT true,
  preferred_contact_method TEXT DEFAULT 'email', -- 'email', 'sms', 'both'

  -- Custody (for divorced/separated parents)
  custody_percentage INTEGER,                 -- Legal custody percentage
  court_order_on_file BOOLEAN DEFAULT false,
  court_order_notes TEXT,

  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.school_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_student_guardians_student
  ON public.student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_primary
  ON public.student_guardians(student_id) WHERE is_primary = true;

COMMENT ON TABLE public.student_guardians IS
  'Multiple guardians per student with financial responsibility split for divorced parents';

-- ============================================================
-- PART 6: FEE CATEGORIES (Types of Fees)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fee_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                         -- 'Tuition Fee', 'Laboratory Fee'
  code TEXT NOT NULL,                         -- 'TUI', 'LAB', 'BUS'
  description TEXT,

  category_type TEXT NOT NULL CHECK (category_type IN (
    'tuition',           -- Core tuition
    'miscellaneous',     -- Lab, library, ID, etc.
    'optional',          -- Bus, lunch, uniforms
    'one_time',          -- Enrollment, graduation
    'penalty'            -- Late fees
  )),

  -- Behavior
  is_recurring BOOLEAN DEFAULT true,          -- Charged every school year?
  is_optional BOOLEAN DEFAULT false,          -- Can parent opt out?
  is_refundable BOOLEAN DEFAULT true,         -- Can be refunded if student withdraws?
  refund_policy TEXT,                         -- Description of refund terms

  -- For DepEd compliance
  deped_fee_code TEXT,                        -- DepEd standard fee code if applicable
  requires_deped_approval BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.school_profiles(id),

  UNIQUE(school_id, code)
);

CREATE INDEX IF NOT EXISTS idx_fee_categories_school
  ON public.fee_categories(school_id) WHERE is_active = true;

COMMENT ON TABLE public.fee_categories IS
  'Master list of fee types (tuition, misc, optional, penalties)';

-- ============================================================
-- PART 7: FEE STRUCTURES (Amounts per Grade Level)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  school_year_id UUID NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
  fee_category_id UUID NOT NULL REFERENCES public.fee_categories(id) ON DELETE CASCADE,

  -- Scope
  grade_level TEXT,                           -- NULL = all grades, or 'Grade 7', 'Grade 10'
  section_id UUID REFERENCES public.sections(id), -- NULL = all sections, or specific section
  track TEXT,                                 -- 'STEM', 'HUMSS', 'ABM' for SHS

  -- Amount
  amount DECIMAL(12,2) NOT NULL,

  -- DepEd compliance (for tuition)
  previous_year_amount DECIMAL(12,2),
  increase_percentage DECIMAL(5,2),
  deped_approval_number TEXT,
  deped_approval_date DATE,

  -- Validity
  effective_from DATE NOT NULL,
  effective_until DATE,                       -- NULL = no end date

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.school_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_lookup
  ON public.fee_structures(school_id, school_year_id, fee_category_id, grade_level);

COMMENT ON TABLE public.fee_structures IS
  'Fee amounts per grade level per school year with DepEd compliance tracking';

-- ============================================================
-- PART 8: PAYMENT PLANS (Installment Options)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                         -- 'Full Payment', 'Quarterly', 'Monthly'
  code TEXT NOT NULL,                         -- 'FULL', 'QTR', 'MTH'
  description TEXT,

  installment_count INTEGER NOT NULL,         -- 1, 4, 10

  -- Discount for choosing this plan
  discount_percentage DECIMAL(5,2) DEFAULT 0, -- 5% off for full payment
  discount_amount DECIMAL(12,2) DEFAULT 0,    -- OR fixed amount off

  -- Due date rules
  schedule_rules JSONB NOT NULL,
  -- Examples:
  -- {"type": "monthly", "due_day": 15, "start_month": 6}
  -- {"type": "quarterly", "months": [6, 9, 12, 3]}
  -- {"type": "fixed", "dates": ["2025-08-15", "2025-11-15"]}

  -- Late fee settings
  grace_period_days INTEGER DEFAULT 7,
  late_fee_type TEXT DEFAULT 'fixed' CHECK (late_fee_type IN ('fixed', 'percentage')),
  late_fee_amount DECIMAL(12,2) DEFAULT 0,    -- Fixed amount OR percentage
  max_late_fee DECIMAL(12,2),                 -- Cap on late fees

  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(school_id, code)
);

COMMENT ON TABLE public.payment_plans IS
  'Available payment schedules (full, quarterly, monthly) with late fee configuration';

-- ============================================================
-- PART 9: STUDENT FEE ACCOUNTS (One per Student per Year)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_fee_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_year_id UUID NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,

  -- Grade at time of assessment (won't change even if student repeats)
  grade_level_at_assessment TEXT NOT NULL,
  section_at_assessment_id UUID REFERENCES public.sections(id),

  -- Payment plan selected
  payment_plan_id UUID REFERENCES public.payment_plans(id),

  -- Calculated totals (updated via triggers)
  total_assessed DECIMAL(12,2) DEFAULT 0,
  total_discounts DECIMAL(12,2) DEFAULT 0,
  total_government_assistance DECIMAL(12,2) DEFAULT 0, -- GASTPE, ESC
  total_paid DECIMAL(12,2) DEFAULT 0,
  total_refunded DECIMAL(12,2) DEFAULT 0,
  total_late_fees DECIMAL(12,2) DEFAULT 0,
  total_adjustments DECIMAL(12,2) DEFAULT 0,

  -- Computed balance
  current_balance DECIMAL(12,2) GENERATED ALWAYS AS (
    total_assessed - total_discounts - total_government_assistance
    - total_paid + total_refunded + total_late_fees + total_adjustments
  ) STORED,

  -- Credit balance (if overpaid)
  credit_balance DECIMAL(12,2) DEFAULT 0,

  -- Days overdue calculation (updated by trigger/cron)
  oldest_overdue_date DATE,
  days_overdue INTEGER DEFAULT 0,

  -- Account status
  status TEXT DEFAULT 'active' CHECK (status IN (
    'draft',         -- Being set up
    'active',        -- Normal operation
    'on_hold',       -- Restricted due to non-payment
    'settled',       -- Fully paid (balance = 0)
    'withdrawn',     -- Student withdrew
    'transferred',   -- Student transferred out
    'archived'       -- Historical record
  )),

  -- Hold information
  hold_reason TEXT,
  hold_date TIMESTAMPTZ,
  hold_by UUID REFERENCES public.school_profiles(id),
  hold_restrictions JSONB,                    -- What's restricted
  -- Example: {"grades": true, "certificates": true, "enrollment": true}

  -- Carry forward from previous year
  carried_forward_balance DECIMAL(12,2) DEFAULT 0,
  carried_from_account_id UUID REFERENCES public.student_fee_accounts(id),

  -- Optimistic locking for race conditions (Critical Fix #4)
  version INTEGER DEFAULT 0,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assessed_at TIMESTAMPTZ,
  assessed_by UUID REFERENCES public.school_profiles(id),

  UNIQUE(student_id, school_year_id)
);

CREATE INDEX IF NOT EXISTS idx_student_fee_accounts_student
  ON public.student_fee_accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_accounts_balance
  ON public.student_fee_accounts(school_year_id, current_balance)
  WHERE current_balance > 0;
CREATE INDEX IF NOT EXISTS idx_student_fee_accounts_status
  ON public.student_fee_accounts(status);
CREATE INDEX IF NOT EXISTS idx_student_fee_accounts_overdue
  ON public.student_fee_accounts(days_overdue)
  WHERE days_overdue > 0;

COMMENT ON TABLE public.student_fee_accounts IS
  'Master fee account per student per school year with optimistic locking';

-- ============================================================
-- PART 10: FEE LINE ITEMS (Individual Fees Assessed)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fee_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id UUID NOT NULL REFERENCES public.student_fee_accounts(id) ON DELETE CASCADE,
  fee_category_id UUID NOT NULL REFERENCES public.fee_categories(id),
  fee_structure_id UUID REFERENCES public.fee_structures(id),

  description TEXT NOT NULL,                  -- 'Tuition - Grade 10 STEM'

  -- Amount
  amount DECIMAL(12,2) NOT NULL,

  -- For optional fees
  is_optional BOOLEAN DEFAULT false,
  opted_in BOOLEAN DEFAULT true,              -- Did parent select this?
  opted_in_at TIMESTAMPTZ,
  opted_in_by UUID REFERENCES public.school_profiles(id),

  -- Cannot delete if payments made, only void
  is_voided BOOLEAN DEFAULT false,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES public.school_profiles(id),
  void_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.school_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_fee_line_items_account
  ON public.fee_line_items(student_fee_account_id) WHERE NOT is_voided;

COMMENT ON TABLE public.fee_line_items IS
  'Individual fee charges on student account (tuition, lab fee, etc.)';

-- ============================================================
-- PART 11: FEE DISCOUNTS (Scholarships, Sibling, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fee_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id UUID NOT NULL REFERENCES public.student_fee_accounts(id) ON DELETE CASCADE,

  discount_type TEXT NOT NULL CHECK (discount_type IN (
    'scholarship',       -- Academic/athletic scholarship
    'sibling',           -- Multiple children discount
    'employee',          -- Staff/faculty child
    'early_bird',        -- Early enrollment discount
    'financial_aid',     -- Need-based assistance
    'promo',             -- Promotional discount
    'payment_plan',      -- Discount for full payment
    'adjustment'         -- Manual adjustment
  )),

  name TEXT NOT NULL,                         -- 'Honor Student Scholarship'
  description TEXT,

  -- Either percentage OR fixed amount
  discount_percentage DECIMAL(5,2),           -- 15.00 = 15%
  discount_fixed_amount DECIMAL(12,2),

  -- Computed actual discount amount
  computed_amount DECIMAL(12,2) NOT NULL,

  -- Applies to specific fee category or all?
  applies_to_category_id UUID REFERENCES public.fee_categories(id), -- NULL = all fees

  -- Validity period
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',       -- Awaiting approval
    'active',        -- Currently applied
    'revoked',       -- Cancelled
    'expired'        -- Past validity period
  )),

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES public.school_profiles(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Revocation tracking
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.school_profiles(id),
  revocation_reason TEXT,
  retroactive_billing_required BOOLEAN DEFAULT false,
  retroactive_amount DECIMAL(12,2),

  -- Supporting documents
  supporting_document_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.school_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_fee_discounts_account
  ON public.fee_discounts(student_fee_account_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_fee_discounts_type
  ON public.fee_discounts(discount_type);

COMMENT ON TABLE public.fee_discounts IS
  'Scholarships, sibling discounts, and other fee reductions with approval workflow';

-- ============================================================
-- PART 12: PAYMENT SCHEDULES (Installment Due Dates)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id UUID NOT NULL REFERENCES public.student_fee_accounts(id) ON DELETE CASCADE,

  installment_number INTEGER NOT NULL,        -- 1, 2, 3, 4...
  installment_label TEXT,                     -- 'Q1', 'August', 'First Semester'

  due_date DATE NOT NULL,
  amount_due DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) DEFAULT 0,

  status TEXT DEFAULT 'pending' CHECK (status IN (
    'upcoming',      -- Not yet due
    'pending',       -- Due but not paid
    'partially_paid',
    'paid',          -- Fully paid
    'overdue',       -- Past due date, not fully paid
    'waived'         -- Waived by admin
  )),

  -- Late fee tracking
  grace_period_days INTEGER DEFAULT 7,
  grace_period_end DATE,                      -- Calculated from due_date + grace_period_days
  late_fee_assessed DECIMAL(12,2) DEFAULT 0,
  late_fee_paid DECIMAL(12,2) DEFAULT 0,
  late_fee_waived BOOLEAN DEFAULT false,
  late_fee_waived_by UUID REFERENCES public.school_profiles(id),
  late_fee_waived_reason TEXT,

  -- Reminder tracking
  reminder_7day_sent_at TIMESTAMPTZ,
  reminder_3day_sent_at TIMESTAMPTZ,
  reminder_dueday_sent_at TIMESTAMPTZ,
  overdue_notice_sent_at TIMESTAMPTZ,

  -- Waiver info
  waived_at TIMESTAMPTZ,
  waived_by UUID REFERENCES public.school_profiles(id),
  waiver_reason TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_account
  ON public.payment_schedules(student_fee_account_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date
  ON public.payment_schedules(due_date) WHERE status IN ('pending', 'overdue');
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status
  ON public.payment_schedules(status);

COMMENT ON TABLE public.payment_schedules IS
  'Installment due dates per student account with late fee and reminder tracking';

-- ============================================================
-- PART 13: OR NUMBER SERIES (BIR Compliance - Critical Fix #5)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.or_number_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,

  series_name TEXT NOT NULL,                  -- 'Series A 2026'
  prefix TEXT NOT NULL DEFAULT 'OR-',         -- 'OR-', 'CR-'

  starting_number INTEGER NOT NULL,
  ending_number INTEGER NOT NULL,
  current_number INTEGER NOT NULL,

  -- BIR information
  bir_permit_number TEXT,
  bir_permit_date DATE,
  school_tin TEXT,

  -- Validity
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active',
    'exhausted',     -- All numbers used
    'expired',       -- Past validity
    'cancelled'
  )),

  exhausted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.school_profiles(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_or_series_active
  ON public.or_number_series(school_id) WHERE status = 'active';

COMMENT ON TABLE public.or_number_series IS
  'BIR-registered Official Receipt number series management';

-- ============================================================
-- PART 14: PAYMENTS (Actual Payment Records)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id UUID NOT NULL REFERENCES public.student_fee_accounts(id) ON DELETE CASCADE,
  payment_schedule_id UUID REFERENCES public.payment_schedules(id),

  -- Payment details
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATE NOT NULL,

  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'cash',
    'check',
    'bank_transfer',
    'bank_deposit',
    'gcash',
    'maya',
    'credit_card',
    'debit_card',
    'grabpay',
    'other_ewallet',
    'payment_center',    -- 7-Eleven, Bayad Center
    'auto_debit',
    'internal_transfer'  -- Credit balance applied
  )),

  -- Gateway fees (who pays?)
  gross_amount DECIMAL(12,2),                 -- Amount parent paid
  gateway_fee DECIMAL(12,2) DEFAULT 0,        -- Gateway charges
  net_amount DECIMAL(12,2),                   -- School receives
  gateway_fee_paid_by TEXT DEFAULT 'school' CHECK (gateway_fee_paid_by IN ('school', 'parent')),

  -- Reference numbers
  reference_number TEXT,                      -- Bank reference, transaction ID
  gateway_reference TEXT,                     -- PayMongo payment ID
  gateway_transaction_id UUID,                -- Link to gateway_transactions table

  -- For checks
  check_number TEXT,
  check_bank TEXT,
  check_date DATE,
  check_status TEXT CHECK (check_status IN ('pending', 'cleared', 'bounced')),

  -- For bank transfers/deposits
  bank_name TEXT,
  depositor_name TEXT,

  -- BIR Official Receipt (Critical Fix #5)
  or_number TEXT UNIQUE,
  or_series_id UUID REFERENCES public.or_number_series(id),
  or_printed_at TIMESTAMPTZ,
  or_delivered_to_parent BOOLEAN DEFAULT false,
  or_delivery_method TEXT,                    -- 'email', 'printed', 'both'

  -- Receipt
  receipt_url TEXT,                           -- PDF storage path

  -- Proof of payment (for manual recording)
  proof_url TEXT,                             -- Uploaded deposit slip, screenshot

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN (
    'pending',           -- Awaiting verification
    'processing',        -- Gateway processing
    'completed',         -- Confirmed
    'failed',            -- Failed/declined
    'voided',            -- Cancelled by admin
    'refunded',          -- Money returned
    'chargeback'         -- Disputed by cardholder
  )),

  -- Status history for audit
  status_history JSONB DEFAULT '[]'::jsonb,

  -- Void information
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES public.school_profiles(id),
  void_approved_by UUID REFERENCES public.school_profiles(id),

  -- Audit
  recorded_by UUID REFERENCES public.school_profiles(id),
  verified_by UUID REFERENCES public.school_profiles(id),
  verified_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_account
  ON public.payments(student_fee_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_date
  ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status
  ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method
  ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_or
  ON public.payments(or_number) WHERE or_number IS NOT NULL;

COMMENT ON TABLE public.payments IS
  'All payment transactions with BIR OR tracking and gateway fee handling';

-- ============================================================
-- PART 15: PAYMENT GATEWAY TRANSACTIONS (PayMongo Webhooks)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_gateway_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  gateway TEXT NOT NULL DEFAULT 'paymongo',   -- paymongo, dragonpay, xendit

  -- External IDs (for idempotency)
  external_id TEXT NOT NULL,                  -- PayMongo event ID
  payment_intent_id TEXT,                     -- PayMongo payment intent
  checkout_session_id TEXT,                   -- PayMongo checkout session

  -- Link to our records
  student_fee_account_id UUID REFERENCES public.student_fee_accounts(id),
  payment_id UUID REFERENCES public.payments(id),

  -- Transaction details
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'PHP',
  payment_method_type TEXT,                   -- gcash, maya, card

  -- Customer info from gateway
  billing_name TEXT,
  billing_email TEXT,
  billing_phone TEXT,

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN (
    'pending',
    'awaiting_payment',
    'processing',
    'paid',
    'failed',
    'expired',
    'refunded',
    'chargeback',
    'voided'
  )),

  -- Webhook data (store full payload for debugging)
  webhook_payload JSONB,
  webhook_received_at TIMESTAMPTZ,
  webhook_signature_valid BOOLEAN,

  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,

  -- Failure info
  failure_code TEXT,
  failure_message TEXT,

  -- Timestamps from gateway
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Idempotency constraint
  UNIQUE(gateway, external_id)
);

CREATE INDEX IF NOT EXISTS idx_gateway_transactions_external
  ON public.payment_gateway_transactions(external_id);
CREATE INDEX IF NOT EXISTS idx_gateway_transactions_account
  ON public.payment_gateway_transactions(student_fee_account_id);
CREATE INDEX IF NOT EXISTS idx_gateway_transactions_unprocessed
  ON public.payment_gateway_transactions(processed, status)
  WHERE NOT processed AND status = 'paid';

COMMENT ON TABLE public.payment_gateway_transactions IS
  'PayMongo webhook data with idempotency protection';

-- ============================================================
-- PART 16: REFUNDS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fee_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id UUID NOT NULL REFERENCES public.student_fee_accounts(id),
  payment_id UUID REFERENCES public.payments(id),

  amount DECIMAL(12,2) NOT NULL,

  refund_type TEXT NOT NULL CHECK (refund_type IN (
    'withdrawal',        -- Student withdrew
    'overpayment',       -- Paid too much
    'error_correction',  -- Wrong amount charged
    'scholarship_adjustment',
    'duplicate_payment',
    'other'
  )),

  reason TEXT NOT NULL,

  refund_method TEXT CHECK (refund_method IN (
    'cash',
    'check',
    'bank_transfer',
    'original_method',   -- Refund to same payment method
    'credit_balance'     -- Apply as credit to account
  )),

  -- For bank refunds
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,

  -- Processing
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'processing',
    'completed',
    'rejected',
    'cancelled'
  )),

  requested_by UUID REFERENCES public.school_profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),

  approved_by UUID REFERENCES public.school_profiles(id),
  approved_at TIMESTAMPTZ,

  processed_by UUID REFERENCES public.school_profiles(id),
  processed_at TIMESTAMPTZ,

  rejection_reason TEXT,

  -- External reference
  reference_number TEXT,
  gateway_refund_id TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_account
  ON public.fee_refunds(student_fee_account_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status
  ON public.fee_refunds(status) WHERE status = 'pending';

COMMENT ON TABLE public.fee_refunds IS
  'Refund requests and processing with approval workflow';

-- ============================================================
-- PART 17: PAYMENT REMINDERS (Track Sent Notifications)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id UUID NOT NULL REFERENCES public.student_fee_accounts(id),
  payment_schedule_id UUID REFERENCES public.payment_schedules(id),
  guardian_id UUID REFERENCES public.student_guardians(id),

  reminder_type TEXT NOT NULL CHECK (reminder_type IN (
    'upcoming_7_days',
    'upcoming_3_days',
    'due_today',
    'overdue_1_day',
    'overdue_7_days',
    'overdue_14_days',
    'overdue_30_days',
    'final_notice',
    'custom'
  )),

  -- Delivery
  sent_via TEXT NOT NULL CHECK (sent_via IN ('email', 'sms', 'in_app', 'push')),
  sent_to TEXT,                               -- Email address or phone number

  -- Content
  subject TEXT,
  message_content TEXT,

  -- AI generated?
  ai_generated BOOLEAN DEFAULT false,
  ai_tone TEXT,                               -- friendly, firm, urgent

  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN (
    'pending', 'queued', 'sent', 'delivered', 'failed', 'bounced'
  )),
  failure_reason TEXT,

  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  sent_by UUID REFERENCES public.school_profiles(id),  -- NULL if automated

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_account
  ON public.payment_reminders(student_fee_account_id);
CREATE INDEX IF NOT EXISTS idx_reminders_sent_at
  ON public.payment_reminders(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminders_type
  ON public.payment_reminders(reminder_type);

COMMENT ON TABLE public.payment_reminders IS
  'Track all payment reminder notifications sent to guardians';

-- ============================================================
-- PART 18: FEE ACCOUNT ACTIVITY LOG (Audit Trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fee_account_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id UUID NOT NULL REFERENCES public.student_fee_accounts(id),

  action TEXT NOT NULL CHECK (action IN (
    'account_created',
    'fee_assessed',
    'fee_removed',
    'fee_voided',
    'discount_applied',
    'discount_revoked',
    'payment_recorded',
    'payment_voided',
    'payment_failed',
    'refund_requested',
    'refund_approved',
    'refund_processed',
    'refund_rejected',
    'account_hold',
    'account_released',
    'payment_plan_changed',
    'balance_adjusted',
    'late_fee_assessed',
    'late_fee_waived',
    'reminder_sent',
    'statement_generated',
    'or_issued',
    'status_changed'
  )),

  description TEXT NOT NULL,

  -- What changed
  old_value JSONB,
  new_value JSONB,

  -- Related records
  related_payment_id UUID,
  related_discount_id UUID,
  related_refund_id UUID,
  related_schedule_id UUID,

  performed_by UUID REFERENCES public.school_profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Request metadata
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_log_account
  ON public.fee_account_activity_log(student_fee_account_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action
  ON public.fee_account_activity_log(action);

COMMENT ON TABLE public.fee_account_activity_log IS
  'Complete audit trail of all financial operations for compliance';

-- ============================================================
-- PART 19: FEE ACCOUNT SNAPSHOTS (Historical Balances)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fee_account_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id UUID NOT NULL REFERENCES public.student_fee_accounts(id),

  snapshot_date DATE NOT NULL,

  total_assessed DECIMAL(12,2),
  total_discounts DECIMAL(12,2),
  total_paid DECIMAL(12,2),
  total_refunded DECIMAL(12,2),
  current_balance DECIMAL(12,2),
  days_overdue INTEGER,
  status TEXT,
  payment_plan_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_fee_account_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_date
  ON public.fee_account_snapshots(snapshot_date);

COMMENT ON TABLE public.fee_account_snapshots IS
  'Daily snapshots of account balances for historical reporting and audits';

-- ============================================================
-- PART 20: GOVERNMENT FINANCIAL ASSISTANCE (GASTPE, ESC)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.government_financial_assistance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_fee_account_id UUID NOT NULL REFERENCES public.student_fee_accounts(id),
  student_id UUID NOT NULL REFERENCES public.students(id),

  program_type TEXT NOT NULL CHECK (program_type IN (
    'GASTPE',        -- Government Assistance to Students and Teachers in Private Education
    'ESC',           -- Education Service Contracting
    'SHS_Voucher',   -- Senior High School Voucher Program
    'TESDA',         -- TESDA scholarship
    'CHED',          -- CHED scholarship
    'LGU',           -- Local government unit scholarship
    'Other'
  )),

  voucher_number TEXT,
  reference_number TEXT,

  amount_covered DECIMAL(12,2) NOT NULL,

  school_year_id UUID REFERENCES public.school_years(id),

  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',       -- Application submitted
    'approved',      -- Approved by agency
    'disbursed',     -- Funds received by school
    'rejected',      -- Application rejected
    'cancelled'      -- Cancelled by student
  )),

  application_date DATE,
  approval_date DATE,
  disbursement_date DATE,

  government_agency TEXT,
  contact_person TEXT,

  supporting_documents_url TEXT,

  remarks TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.school_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_gov_assistance_student
  ON public.government_financial_assistance(student_id);
CREATE INDEX IF NOT EXISTS idx_gov_assistance_type
  ON public.government_financial_assistance(program_type, status);

COMMENT ON TABLE public.government_financial_assistance IS
  'Track government scholarships (GASTPE, ESC) for proper billing';

-- ============================================================
-- PART 21: SCHOOL CALENDAR EVENTS (Break Periods)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.school_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  school_year_id UUID REFERENCES public.school_years(id),

  event_type TEXT NOT NULL CHECK (event_type IN (
    'holiday',       -- Single day holiday
    'break',         -- Multi-day break (summer, Christmas)
    'exam_period',   -- Finals week
    'enrollment',    -- Enrollment period
    'graduation',    -- Graduation week
    'special'        -- Other events
  )),

  name TEXT NOT NULL,                         -- 'Christmas Break', 'Summer Vacation'

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  is_office_closed BOOLEAN DEFAULT false,     -- Is finance office closed?
  pause_reminders BOOLEAN DEFAULT false,      -- Should we pause payment reminders?

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.school_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_dates
  ON public.school_calendar_events(school_id, start_date, end_date);

COMMENT ON TABLE public.school_calendar_events IS
  'School calendar for break periods - pauses payment reminders during vacations';

-- ============================================================
-- PART 22: EMAIL SEND QUEUE (Rate Limiting)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_send_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  to_email TEXT NOT NULL,
  to_name TEXT,

  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,

  template_id TEXT,                           -- Email template reference
  template_data JSONB,                        -- Variables for template

  -- Priority (lower = higher priority)
  priority INTEGER DEFAULT 5,                 -- 1=urgent, 3=reminder, 5=marketing

  -- Related records
  related_type TEXT,                          -- 'payment_reminder', 'receipt', etc.
  related_id UUID,

  -- Scheduling
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'queued', 'sending', 'sent', 'failed', 'bounced', 'cancelled'
  )),

  sent_at TIMESTAMPTZ,

  -- Retry handling
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,

  -- External reference
  provider TEXT,                              -- 'resend', 'sendgrid'
  external_id TEXT,                           -- Provider's message ID

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_pending
  ON public.email_send_queue(scheduled_at, priority)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_retry
  ON public.email_send_queue(next_retry_at)
  WHERE status = 'failed' AND retry_count < max_retries;

COMMENT ON TABLE public.email_send_queue IS
  'Email send queue with rate limiting and retry handling';

-- ============================================================
-- PART 23: NOTIFICATION PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fee_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,

  -- Channels
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,

  -- Contact info override
  notification_email TEXT,
  notification_phone TEXT,

  -- Preferences
  reminder_days_before INTEGER DEFAULT 7,
  language TEXT DEFAULT 'en',                 -- en, tl (Tagalog)

  -- Quiet hours (don't send during these times)
  quiet_start_time TIME,
  quiet_end_time TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id)
);

COMMENT ON TABLE public.fee_notification_preferences IS
  'Per-student notification preferences for payment reminders';

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Get next OR number (with locking)
CREATE OR REPLACE FUNCTION public.get_next_or_number(p_school_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_series RECORD;
  v_next_or TEXT;
BEGIN
  -- Lock and get active series
  SELECT * INTO v_series
  FROM public.or_number_series
  WHERE school_id = p_school_id
    AND status = 'active'
    AND current_number < ending_number
    AND valid_from <= CURRENT_DATE
    AND valid_until >= CURRENT_DATE
  FOR UPDATE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No valid OR series available for school. Please create a new series.';
  END IF;

  -- Generate OR number
  v_next_or := v_series.prefix || LPAD(v_series.current_number::TEXT, 8, '0');

  -- Increment counter
  UPDATE public.or_number_series
  SET current_number = current_number + 1,
      status = CASE
        WHEN current_number + 1 >= ending_number THEN 'exhausted'
        ELSE status
      END,
      exhausted_at = CASE
        WHEN current_number + 1 >= ending_number THEN NOW()
        ELSE exhausted_at
      END
  WHERE id = v_series.id;

  RETURN v_next_or;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate sibling discount
CREATE OR REPLACE FUNCTION public.calculate_sibling_discount(p_student_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  v_sibling_count INT;
  v_discount_pct DECIMAL(5,2);
BEGIN
  -- Count active siblings in same school year
  SELECT COUNT(*) INTO v_sibling_count
  FROM public.family_members fm
  JOIN public.students s ON s.id = fm.student_id
  JOIN public.student_fee_accounts sfa ON sfa.student_id = s.id
  WHERE fm.family_group_id = (
    SELECT family_group_id
    FROM public.family_members
    WHERE student_id = p_student_id
      AND is_active = true
    LIMIT 1
  )
  AND fm.is_active = true
  AND s.enrollment_status IN ('approved', 'assessed', 'partial_paid', 'fully_paid')
  AND sfa.status IN ('active', 'settled');

  -- Progressive discount based on sibling count
  v_discount_pct := CASE
    WHEN v_sibling_count >= 4 THEN 20.0
    WHEN v_sibling_count = 3 THEN 15.0
    WHEN v_sibling_count = 2 THEN 10.0
    ELSE 0.0
  END;

  RETURN v_discount_pct;
END;
$$ LANGUAGE plpgsql;

-- Function: Update account balance (called after payment changes)
CREATE OR REPLACE FUNCTION public.update_fee_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate totals from source tables
  UPDATE public.student_fee_accounts sfa
  SET
    total_paid = COALESCE((
      SELECT SUM(amount) FROM public.payments
      WHERE student_fee_account_id = sfa.id AND status = 'completed'
    ), 0),
    total_refunded = COALESCE((
      SELECT SUM(amount) FROM public.fee_refunds
      WHERE student_fee_account_id = sfa.id AND status = 'completed'
    ), 0),
    updated_at = NOW(),
    version = version + 1
  WHERE sfa.id = COALESCE(NEW.student_fee_account_id, OLD.student_fee_account_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update balance after payment insert/update/delete
DROP TRIGGER IF EXISTS trg_update_balance_on_payment ON public.payments;
CREATE TRIGGER trg_update_balance_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_fee_account_balance();

-- Function: Log fee account activity
CREATE OR REPLACE FUNCTION public.log_fee_account_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.fee_account_activity_log (
    student_fee_account_id,
    action,
    description,
    old_value,
    new_value,
    performed_at
  ) VALUES (
    COALESCE(NEW.student_fee_account_id, OLD.student_fee_account_id),
    TG_ARGV[0],
    TG_ARGV[1],
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Log payment activity
DROP TRIGGER IF EXISTS trg_log_payment_activity ON public.payments;
CREATE TRIGGER trg_log_payment_activity
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.log_fee_account_activity('payment_recorded', 'Payment transaction recorded');

-- Function: Prevent deletion of payments (soft delete only)
CREATE OR REPLACE FUNCTION public.prevent_payment_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Payments cannot be deleted. Use void instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Block payment deletion
DROP TRIGGER IF EXISTS trg_prevent_payment_delete ON public.payments;
CREATE TRIGGER trg_prevent_payment_delete
  BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_hard_delete();

-- Function: Update payment schedule status
CREATE OR REPLACE FUNCTION public.update_payment_schedule_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on payment
  UPDATE public.payment_schedules ps
  SET
    amount_paid = COALESCE((
      SELECT SUM(amount) FROM public.payments
      WHERE payment_schedule_id = ps.id AND status = 'completed'
    ), 0),
    status = CASE
      WHEN COALESCE((
        SELECT SUM(amount) FROM public.payments
        WHERE payment_schedule_id = ps.id AND status = 'completed'
      ), 0) >= ps.amount_due THEN 'paid'
      WHEN COALESCE((
        SELECT SUM(amount) FROM public.payments
        WHERE payment_schedule_id = ps.id AND status = 'completed'
      ), 0) > 0 THEN 'partially_paid'
      WHEN ps.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END,
    updated_at = NOW()
  WHERE ps.id = NEW.payment_schedule_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update schedule on payment
DROP TRIGGER IF EXISTS trg_update_schedule_on_payment ON public.payments;
CREATE TRIGGER trg_update_schedule_on_payment
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NEW.payment_schedule_id IS NOT NULL)
  EXECUTE FUNCTION public.update_payment_schedule_status();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all payment tables
ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.or_number_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_account_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_financial_assistance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Service role policies (for API routes using service client)
-- These allow full access when using the service role key

CREATE POLICY "Service role full access" ON public.school_years
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.family_groups
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.family_members
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.student_guardians
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.fee_categories
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.fee_structures
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.payment_plans
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.student_fee_accounts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.fee_line_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.fee_discounts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.payment_schedules
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.or_number_series
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.payments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.payment_gateway_transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.fee_refunds
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.payment_reminders
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.fee_account_activity_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.fee_account_snapshots
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.government_financial_assistance
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.school_calendar_events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.email_send_queue
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.fee_notification_preferences
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON SCHEMA public IS
  'Main schema containing all tables including payment system (Phase 0)';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
