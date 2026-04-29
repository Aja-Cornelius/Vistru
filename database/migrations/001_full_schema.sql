-- ═══════════════════════════════════════════════════════════
--  VISTRU — Full Database Schema
--  database/migrations/001_full_schema.sql
--
--  Run with: psql -U vistru_user -d vistru_db -f 001_full_schema.sql
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
--  ENUM TYPES
-- ─────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('client', 'engineer', 'supplier', 'lawyer', 'admin');
CREATE TYPE account_status AS ENUM ('pending_email', 'pending_review', 'active', 'suspended', 'deactivated');
CREATE TYPE project_status AS ENUM ('pending_land', 'land_verified', 'drawings_uploaded', 'boq_selection', 'contract_signed', 'in_progress', 'completed', 'disputed', 'cancelled');
CREATE TYPE verification_status AS ENUM ('pending', 'under_review', 'verified', 'rejected', 'disputed');
CREATE TYPE milestone_status AS ENUM ('pending_funding', 'funded', 'in_progress', 'filed', 'under_review', 'completed', 'disputed');
CREATE TYPE escrow_status AS ENUM ('held', 'released', 'refunded', 'disputed');
CREATE TYPE escrow_type AS ENUM ('milestone', 'material', 'legal_fee', 'cctv_fee', 'agent_visit');
CREATE TYPE order_status AS ENUM ('placed', 'confirmed', 'dispatched', 'delivered', 'completed', 'disputed');
CREATE TYPE arbitration_status AS ENUM ('filed', 'under_review', 'scheduled', 'ruling_issued', 'closed');
CREATE TYPE contract_status AS ENUM ('draft', 'sent', 'signed', 'active', 'completed', 'terminated');
CREATE TYPE notification_type AS ENUM ('info', 'action_required', 'payment', 'milestone', 'arbitration', 'system');
CREATE TYPE document_type AS ENUM ('cof_o', 'survey_plan', 'deed_of_assignment', 'government_approval', 'other_land_doc', 'architectural_drawing', 'structural_drawing', 'id_document', 'selfie_with_id', 'cac_certificate', 'licence_certificate', 'academic_cert', 'boq_pdf', 'contract_doc', 'cctv_report');

-- ─────────────────────────────────────────
--  USERS  (all roles in one table)
-- ─────────────────────────────────────────
CREATE TABLE users (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  role              user_role     NOT NULL,
  status            account_status NOT NULL DEFAULT 'pending_email',

  -- Personal
  first_name        VARCHAR(100)  NOT NULL,
  last_name         VARCHAR(100)  NOT NULL,
  email             VARCHAR(255)  NOT NULL UNIQUE,
  phone             VARCHAR(30)   NOT NULL,
  password_hash     TEXT          NOT NULL,
  nationality       VARCHAR(100),
  date_of_birth     DATE,
  residential_address TEXT,

  -- Identity
  id_type           VARCHAR(50),   -- nin, bvn, passport, drivers, voters
  id_number         VARCHAR(100),
  id_document_url   TEXT,          -- cloud storage URL
  selfie_url        TEXT,

  -- Security
  security_question TEXT,
  security_answer   TEXT,          -- hashed

  -- Email verification
  email_verified    BOOLEAN       DEFAULT FALSE,
  email_otp         TEXT,
  email_otp_expires TIMESTAMPTZ,

  -- Password reset
  reset_token       TEXT,
  reset_token_expires TIMESTAMPTZ,

  -- Tokens
  refresh_token     TEXT,

  -- Timestamps
  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW(),
  last_login        TIMESTAMPTZ
);

-- ─────────────────────────────────────────
--  ENGINEER PROFILES
-- ─────────────────────────────────────────
CREATE TABLE engineer_profiles (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Licence
  licence_body      VARCHAR(100),  -- COREN, NSE, etc.
  licence_number    VARCHAR(100),
  licence_expiry    DATE,
  licence_doc_url   TEXT,
  licence_verified  BOOLEAN       DEFAULT FALSE,

  -- Qualifications
  discipline        VARCHAR(100),  -- civil, structural, mep, etc.
  highest_qualification VARCHAR(50),
  academic_cert_url TEXT,
  years_experience  VARCHAR(20),

  -- Specialisations (array)
  specialisations   TEXT[],        -- ['residential','commercial','highrise']

  -- Operations
  primary_state     VARCHAR(100),
  bio               TEXT,

  -- Status
  is_available      BOOLEAN       DEFAULT TRUE,
  featured_listing  BOOLEAN       DEFAULT FALSE,
  featured_until    TIMESTAMPTZ,

  -- Stats
  total_projects    INTEGER       DEFAULT 0,
  total_earned      BIGINT        DEFAULT 0,  -- in kobo
  boq_win_rate      NUMERIC(5,2)  DEFAULT 0,

  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  SUPPLIER PROFILES
-- ─────────────────────────────────────────
CREATE TABLE supplier_profiles (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Business
  business_name     VARCHAR(255)  NOT NULL,
  business_type     VARCHAR(50),   -- sole, partnership, ltd, enterprise
  cac_number        VARCHAR(100),
  cac_doc_url       TEXT,
  cac_verified      BOOLEAN       DEFAULT FALSE,

  -- Store
  store_address     TEXT,
  state             VARCHAR(100),
  lga               VARCHAR(100),
  coverage_area     TEXT,

  -- Categories (array)
  material_categories TEXT[],

  -- Delivery
  delivery_turnaround VARCHAR(50),
  has_own_vehicles  BOOLEAN       DEFAULT FALSE,
  vehicle_count     INTEGER       DEFAULT 0,
  minimum_order     BIGINT        DEFAULT 0,  -- in kobo

  -- Bank
  bank_name         VARCHAR(100),
  account_number    VARCHAR(20),
  account_name      VARCHAR(255),
  account_type      VARCHAR(20),

  -- Status
  featured_listing  BOOLEAN       DEFAULT FALSE,
  featured_until    TIMESTAMPTZ,

  -- Stats
  total_orders      INTEGER       DEFAULT 0,
  total_earned      BIGINT        DEFAULT 0,  -- in kobo
  rating            NUMERIC(3,2)  DEFAULT 0,
  review_count      INTEGER       DEFAULT 0,

  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  LAWYER PROFILES  (onboarded by Vistru)
-- ─────────────────────────────────────────
CREATE TABLE lawyer_profiles (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  bar_number        VARCHAR(100),
  bar_branch        VARCHAR(100),
  licence_doc_url   TEXT,
  years_experience  INTEGER,
  assigned_states   TEXT[],       -- states this lawyer covers
  specialisation    TEXT[],       -- ['land_verification','contracts','arbitration']

  -- Stats
  verifications_done  INTEGER     DEFAULT 0,
  contracts_drafted   INTEGER     DEFAULT 0,
  arbitrations_done   INTEGER     DEFAULT 0,
  total_fees_earned   BIGINT      DEFAULT 0,

  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  PROJECTS
-- ─────────────────────────────────────────
CREATE TABLE projects (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         UUID          NOT NULL REFERENCES users(id),
  engineer_id       UUID          REFERENCES users(id),
  lawyer_id         UUID          REFERENCES users(id),

  -- Details
  title             VARCHAR(255)  NOT NULL,
  description       TEXT,
  project_type      VARCHAR(100),  -- residential, commercial, industrial
  status            project_status NOT NULL DEFAULT 'pending_land',

  -- Location
  site_address      TEXT,
  site_state        VARCHAR(100),
  site_lga          VARCHAR(100),
  site_coordinates  POINT,         -- lat/lng for map-based proximity

  -- Financials (all in kobo — 1 NGN = 100 kobo)
  contract_value    BIGINT        DEFAULT 0,
  total_paid        BIGINT        DEFAULT 0,
  escrow_balance    BIGINT        DEFAULT 0,

  -- Progress
  completion_percent INTEGER      DEFAULT 0,
  current_milestone  INTEGER      DEFAULT 0,
  total_milestones   INTEGER      DEFAULT 0,

  -- Timestamps
  start_date        DATE,
  expected_end_date DATE,
  actual_end_date   DATE,

  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  DOCUMENTS  (all uploaded files)
-- ─────────────────────────────────────────
CREATE TABLE documents (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID          REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by       UUID          NOT NULL REFERENCES users(id),
  document_type     document_type NOT NULL,
  file_name         VARCHAR(255)  NOT NULL,
  file_url          TEXT          NOT NULL,   -- Cloudinary / S3 URL
  file_size         INTEGER,                  -- bytes
  mime_type         VARCHAR(100),
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  LAND VERIFICATION
-- ─────────────────────────────────────────
CREATE TABLE land_verifications (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID          NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  lawyer_id         UUID          REFERENCES users(id),
  status            verification_status NOT NULL DEFAULT 'pending',
  notes             TEXT,
  fee_charged       BIGINT        DEFAULT 0,   -- kobo
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  BOQ SUBMISSIONS
-- ─────────────────────────────────────────
CREATE TABLE boq_submissions (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  engineer_id       UUID          NOT NULL REFERENCES users(id),
  total_value       BIGINT        NOT NULL,   -- kobo
  duration_months   INTEGER       NOT NULL,
  milestone_breakdown TEXT,
  boq_doc_url       TEXT,
  notes             TEXT,
  is_awarded        BOOLEAN       DEFAULT FALSE,
  submitted_at      TIMESTAMPTZ   DEFAULT NOW(),
  awarded_at        TIMESTAMPTZ
);

-- ─────────────────────────────────────────
--  CONTRACTS
-- ─────────────────────────────────────────
CREATE TABLE contracts (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID          NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  lawyer_id         UUID          NOT NULL REFERENCES users(id),
  client_id         UUID          NOT NULL REFERENCES users(id),
  engineer_id       UUID          NOT NULL REFERENCES users(id),
  boq_id            UUID          REFERENCES boq_submissions(id),

  status            contract_status NOT NULL DEFAULT 'draft',
  contract_doc_url  TEXT,
  contract_value    BIGINT        NOT NULL,   -- kobo
  duration_months   INTEGER       NOT NULL,
  defect_liability_months INTEGER DEFAULT 12,

  lawyer_fee        BIGINT        DEFAULT 0,  -- kobo (1% of contract)
  special_conditions TEXT,

  client_signed_at  TIMESTAMPTZ,
  engineer_signed_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  MILESTONES
-- ─────────────────────────────────────────
CREATE TABLE milestones (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_number  INTEGER       NOT NULL,
  title             VARCHAR(255)  NOT NULL,   -- e.g. "M1 — Foundation"
  description       TEXT,
  amount            BIGINT        NOT NULL,   -- kobo
  status            milestone_status NOT NULL DEFAULT 'pending_funding',

  funded_at         TIMESTAMPTZ,
  filed_at          TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  payment_released_at TIMESTAMPTZ,

  ai_report_url     TEXT,
  engineer_notes    TEXT,
  client_notes      TEXT,

  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW(),

  UNIQUE(project_id, milestone_number)
);

-- ─────────────────────────────────────────
--  ESCROW TRANSACTIONS
-- ─────────────────────────────────────────
CREATE TABLE escrow_transactions (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID          NOT NULL REFERENCES projects(id),
  milestone_id      UUID          REFERENCES milestones(id),
  order_id          UUID,                     -- links to supplier_orders if material payment
  payer_id          UUID          NOT NULL REFERENCES users(id),
  payee_id          UUID          REFERENCES users(id),

  type              escrow_type   NOT NULL,
  status            escrow_status NOT NULL DEFAULT 'held',

  gross_amount      BIGINT        NOT NULL,   -- kobo
  platform_fee_pct  NUMERIC(5,2)  DEFAULT 2.5,
  platform_fee      BIGINT        DEFAULT 0,  -- kobo (calculated)
  net_amount        BIGINT        DEFAULT 0,  -- gross - fee

  flw_reference     VARCHAR(255),             -- Flutterwave payment reference
  flw_tx_id        VARCHAR(255),
  payment_method    VARCHAR(50),

  held_at           TIMESTAMPTZ   DEFAULT NOW(),
  released_at       TIMESTAMPTZ,
  released_by       UUID          REFERENCES users(id),
  notes             TEXT,

  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  SUPPLIER INVENTORY
-- ─────────────────────────────────────────
CREATE TABLE inventory (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              VARCHAR(255)  NOT NULL,
  category          VARCHAR(100),
  unit              VARCHAR(50),   -- piece, bag, tonne, sheet, etc.
  unit_price        BIGINT        NOT NULL,   -- kobo
  quantity_available INTEGER      NOT NULL DEFAULT 0,
  description       TEXT,
  image_url         TEXT,
  is_available      BOOLEAN       DEFAULT TRUE,
  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  SUPPLIER ORDERS
-- ─────────────────────────────────────────
CREATE TABLE supplier_orders (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID          NOT NULL REFERENCES projects(id),
  client_id         UUID          NOT NULL REFERENCES users(id),
  supplier_id       UUID          NOT NULL REFERENCES users(id),
  order_reference   VARCHAR(20)   UNIQUE NOT NULL,  -- e.g. VT-2054

  status            order_status  NOT NULL DEFAULT 'placed',

  delivery_address  TEXT          NOT NULL,
  delivery_state    VARCHAR(100),

  total_amount      BIGINT        NOT NULL,   -- kobo
  platform_fee      BIGINT        DEFAULT 0,  -- 2% of total

  placed_at         TIMESTAMPTZ   DEFAULT NOW(),
  confirmed_at      TIMESTAMPTZ,
  dispatched_at     TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,

  delivery_notes    TEXT,
  client_notes      TEXT,

  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  ORDER LINE ITEMS
-- ─────────────────────────────────────────
CREATE TABLE order_items (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID          NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
  inventory_id      UUID          NOT NULL REFERENCES inventory(id),
  item_name         VARCHAR(255),
  unit              VARCHAR(50),
  unit_price        BIGINT,       -- kobo at time of order
  quantity          INTEGER       NOT NULL,
  line_total        BIGINT        NOT NULL    -- kobo
);

-- ─────────────────────────────────────────
--  CCTV CAMERAS
-- ─────────────────────────────────────────
CREATE TABLE cctv_cameras (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  camera_label      VARCHAR(100),  -- e.g. "CAM 01 — Front Elevation"
  position          VARCHAR(255),
  stream_url        TEXT,          -- live RTSP or HLS stream URL
  is_active         BOOLEAN       DEFAULT TRUE,
  deployed_at       DATE,
  deployed_by       VARCHAR(100),  -- Vistru agent name
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  CCTV / AI REPORTS
-- ─────────────────────────────────────────
CREATE TABLE cctv_reports (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id      UUID          REFERENCES milestones(id),
  generated_by      VARCHAR(100)  DEFAULT 'Vistru Vision AI',
  report_type       VARCHAR(50),  -- 'periodic','milestone','material_count'

  summary           TEXT,
  observations      TEXT,
  material_counts   JSONB,        -- { "cement_bags": 200, "iron_rods_y16": 58 }
  completion_pct    INTEGER,
  worker_count      INTEGER,
  recommendation    TEXT,

  media_urls        TEXT[],       -- screenshot/clip URLs
  report_doc_url    TEXT,

  generated_at      TIMESTAMPTZ   DEFAULT NOW(),
  reviewed_by       UUID          REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ
);

-- ─────────────────────────────────────────
--  ARBITRATION CASES
-- ─────────────────────────────────────────
CREATE TABLE arbitration_cases (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_reference    VARCHAR(30)   UNIQUE NOT NULL,  -- e.g. ARB-2025-001
  project_id        UUID          NOT NULL REFERENCES projects(id),
  filed_by          UUID          NOT NULL REFERENCES users(id),
  lawyer_id         UUID          REFERENCES users(id),

  nature            VARCHAR(255)  NOT NULL,
  description       TEXT          NOT NULL,
  status            arbitration_status NOT NULL DEFAULT 'filed',

  -- Fees (kobo)
  filing_fee        BIGINT        DEFAULT 7500000,  -- ₦75,000 base
  disputed_amount   BIGINT        DEFAULT 0,
  percentage_fee    BIGINT        DEFAULT 0,         -- 0.5% of disputed
  total_fee_charged BIGINT        DEFAULT 0,

  hearing_date      TIMESTAMPTZ,
  ruling            TEXT,
  ruling_issued_at  TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,

  filed_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  PROJECT LOANS  (engineer cash advance)
-- ─────────────────────────────────────────
CREATE TABLE project_loans (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  engineer_id       UUID          NOT NULL REFERENCES users(id),
  project_id        UUID          NOT NULL REFERENCES projects(id),
  milestone_id      UUID          REFERENCES milestones(id),

  amount_requested  BIGINT        NOT NULL,   -- kobo
  amount_approved   BIGINT        DEFAULT 0,
  amount_outstanding BIGINT       DEFAULT 0,
  purpose           TEXT,

  status            VARCHAR(50)   DEFAULT 'pending',  -- pending, approved, settled, rejected
  approved_at       TIMESTAMPTZ,
  settled_at        TIMESTAMPTZ,
  settled_from_escrow_tx UUID     REFERENCES escrow_transactions(id),

  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE notifications (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              notification_type NOT NULL DEFAULT 'info',
  title             VARCHAR(255)  NOT NULL,
  body              TEXT          NOT NULL,
  link              TEXT,         -- frontend route to navigate to
  is_read           BOOLEAN       DEFAULT FALSE,
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  OTP STORE  (for login / actions)
-- ─────────────────────────────────────────
CREATE TABLE otp_store (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID          REFERENCES users(id) ON DELETE CASCADE,
  email             VARCHAR(255),
  otp_hash          TEXT          NOT NULL,  -- hashed OTP
  purpose           VARCHAR(50),  -- 'email_verify','login','password_reset','action'
  expires_at        TIMESTAMPTZ   NOT NULL,
  used              BOOLEAN       DEFAULT FALSE,
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  AUDIT LOG
-- ─────────────────────────────────────────
CREATE TABLE audit_log (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id          UUID          REFERENCES users(id),
  action            VARCHAR(255)  NOT NULL,
  entity            VARCHAR(100),  -- 'project','escrow','user', etc.
  entity_id         UUID,
  old_value         JSONB,
  new_value         JSONB,
  ip_address        INET,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────
--  INDEXES  (performance)
-- ─────────────────────────────────────────
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_users_role           ON users(role);
CREATE INDEX idx_users_status         ON users(status);
CREATE INDEX idx_projects_client      ON projects(client_id);
CREATE INDEX idx_projects_engineer    ON projects(engineer_id);
CREATE INDEX idx_projects_status      ON projects(status);
CREATE INDEX idx_projects_state       ON projects(site_state);
CREATE INDEX idx_milestones_project   ON milestones(project_id);
CREATE INDEX idx_milestones_status    ON milestones(status);
CREATE INDEX idx_escrow_project       ON escrow_transactions(project_id);
CREATE INDEX idx_escrow_status        ON escrow_transactions(status);
CREATE INDEX idx_orders_project       ON supplier_orders(project_id);
CREATE INDEX idx_orders_supplier      ON supplier_orders(supplier_id);
CREATE INDEX idx_orders_status        ON supplier_orders(status);
CREATE INDEX idx_inventory_supplier   ON inventory(supplier_id);
CREATE INDEX idx_boq_project          ON boq_submissions(project_id);
CREATE INDEX idx_boq_engineer         ON boq_submissions(engineer_id);
CREATE INDEX idx_notifications_user   ON notifications(user_id, is_read);
CREATE INDEX idx_cctv_reports_project ON cctv_reports(project_id);
CREATE INDEX idx_arbitration_project  ON arbitration_cases(project_id);
CREATE INDEX idx_audit_actor          ON audit_log(actor_id);
CREATE INDEX idx_audit_entity         ON audit_log(entity, entity_id);

-- ─────────────────────────────────────────
--  AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated             BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_engineer_updated          BEFORE UPDATE ON engineer_profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_supplier_updated          BEFORE UPDATE ON supplier_profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lawyer_updated            BEFORE UPDATE ON lawyer_profiles     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated          BEFORE UPDATE ON projects            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_milestones_updated        BEFORE UPDATE ON milestones          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contracts_updated         BEFORE UPDATE ON contracts           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_land_updated              BEFORE UPDATE ON land_verifications  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated            BEFORE UPDATE ON supplier_orders     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_updated         BEFORE UPDATE ON inventory           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_loans_updated             BEFORE UPDATE ON project_loans       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_arbitration_updated       BEFORE UPDATE ON arbitration_cases   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
