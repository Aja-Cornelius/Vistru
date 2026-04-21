-- ═══════════════════════════════════════════════════════════
--  VISTRU — Demo Seed Data
--  database/seeds/demo_data.sql
--
--  Run AFTER the schema migration.
--  Passwords below are hashed versions of "Vistru@2025"
-- ═══════════════════════════════════════════════════════════

-- NOTE: The password hash below is for "Vistru@2025"
-- Generated with: bcrypt.hashSync("Vistru@2025", 12)
-- Replace with a fresh hash from your app before using

DO $$
DECLARE
  client_id   UUID := uuid_generate_v4();
  engineer_id UUID := uuid_generate_v4();
  supplier_id UUID := uuid_generate_v4();
  lawyer_id   UUID := uuid_generate_v4();
  admin_id    UUID := uuid_generate_v4();
  project_id  UUID := uuid_generate_v4();
  boq_id      UUID := uuid_generate_v4();
  m1_id       UUID := uuid_generate_v4();
  m2_id       UUID := uuid_generate_v4();
  m3_id       UUID := uuid_generate_v4();
  m4_id       UUID := uuid_generate_v4();
  m5_id       UUID := uuid_generate_v4();
  contract_id UUID := uuid_generate_v4();
  lv_id       UUID := uuid_generate_v4();
  order_id    UUID := uuid_generate_v4();
  inv_id      UUID := uuid_generate_v4();

  pw_hash TEXT := '$2a$12$demoHashReplaceMeWithRealBcryptHash000000000000000000000';

BEGIN

-- ─────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────
INSERT INTO users (id, role, status, first_name, last_name, email, phone, password_hash,
  nationality, residential_address, email_verified)
VALUES
  (client_id,   'client',   'active', 'Adaeze',  'Okonkwo',  'adaeze@demo.vistru.ng',  '08012345678', pw_hash, 'Nigerian', 'No. 5 GRA, Abakaliki',      TRUE),
  (engineer_id, 'engineer', 'active', 'Chidi',   'Eze',       'chidi@demo.vistru.ng',   '08023456789', pw_hash, 'Nigerian', 'No. 12 Lagos Road, Ebonyi', TRUE),
  (supplier_id, 'supplier', 'active', 'Bamike',  'Adeyemi',   'bamike@demo.vistru.ng',  '08034567890', pw_hash, 'Nigerian', 'Mile 50 Market, Abakaliki', TRUE),
  (lawyer_id,   'lawyer',   'active', 'Chukwuemeka', 'Obiechina', 'lawyer@demo.vistru.ng', '08045678901', pw_hash, 'Nigerian', 'No. 3 Court Road, Enugu', TRUE),
  (admin_id,    'admin',    'active', 'Vistru',  'Admin',     'admin@vistru.ng',         '08056789012', pw_hash, 'Nigerian', 'Vistru HQ, Abuja',          TRUE);

-- ─────────────────────────────────────────
--  ENGINEER PROFILE
-- ─────────────────────────────────────────
INSERT INTO engineer_profiles
  (user_id, licence_body, licence_number, licence_expiry, licence_verified,
   discipline, specialisations, years_experience, highest_qualification,
   primary_state, bio, is_available, total_projects, total_earned)
VALUES
  (engineer_id, 'COREN', 'CR/2018/4521', '2026-12-31', TRUE,
   'civil', ARRAY['residential','commercial','highrise'], '7-10', 'beng',
   'Ebonyi', 'Licensed civil engineer with 7 years experience in residential and commercial construction across Ebonyi and Enugu State.',
   TRUE, 3, 2250000000);  -- ₦22.5M in kobo

-- ─────────────────────────────────────────
--  SUPPLIER PROFILE
-- ─────────────────────────────────────────
INSERT INTO supplier_profiles
  (user_id, business_name, business_type, cac_number, cac_verified,
   store_address, state, lga, coverage_area, material_categories,
   delivery_turnaround, has_own_vehicles, vehicle_count,
   bank_name, account_number, account_name, account_type,
   total_orders, total_earned, rating, review_count)
VALUES
  (supplier_id, 'Bamike Steel & Hardware Ltd', 'ltd', 'RC-1234567', TRUE,
   'No. 14 Mile 50 Market, Abakaliki', 'Ebonyi', 'Abakaliki LGA',
   'Ebonyi State, Cross River State',
   ARRAY['iron','cement','aggregates','general'],
   '48', TRUE, 3,
   'Zenith Bank', '2034567890', 'BAMIKE STEEL & HARDWARE LTD', 'business',
   47, 4120000000, 4.9, 47);  -- ₦41.2M earned

-- ─────────────────────────────────────────
--  LAWYER PROFILE
-- ─────────────────────────────────────────
INSERT INTO lawyer_profiles
  (user_id, bar_number, bar_branch, years_experience,
   assigned_states, specialisation,
   verifications_done, contracts_drafted, total_fees_earned)
VALUES
  (lawyer_id, 'NBA/NG/2019/001', 'Enugu Branch', 8,
   ARRAY['Ebonyi','Enugu','Cross River'],
   ARRAY['land_verification','contracts','arbitration'],
   12, 18, 420000000);  -- ₦4.2M

-- ─────────────────────────────────────────
--  PROJECT
-- ─────────────────────────────────────────
INSERT INTO projects
  (id, client_id, engineer_id, lawyer_id, title, description, project_type,
   status, site_address, site_state, site_lga,
   contract_value, total_paid, escrow_balance,
   completion_percent, current_milestone, total_milestones,
   start_date, expected_end_date)
VALUES
  (project_id, client_id, engineer_id, lawyer_id,
   '4-Bedroom Detached Duplex — Plot 18, GRA Extension',
   'A 4-bedroom duplex with BQ, structural and architectural drawings ready.',
   'residential', 'in_progress',
   'Plot 18, GRA Extension, Abakaliki', 'Ebonyi', 'Abakaliki LGA',
   4850000000, 2250000000, 1220000000,   -- ₦48.5M contract, ₦22.5M paid, ₦12.2M escrow
   57, 4, 7,
   '2024-12-15', '2026-06-30');

-- ─────────────────────────────────────────
--  LAND VERIFICATION
-- ─────────────────────────────────────────
INSERT INTO land_verifications (id, project_id, lawyer_id, status, fee_charged, verified_at, notes)
VALUES (lv_id, project_id, lawyer_id, 'verified', 72750000,  -- ₦727,500 (1.5% of ₦48.5M)
  NOW() - INTERVAL '120 days',
  'All documents authenticated. No encumbrance or litigation found at Ebonyi Ministry of Lands.');

-- ─────────────────────────────────────────
--  BOQ SUBMISSION (awarded)
-- ─────────────────────────────────────────
INSERT INTO boq_submissions
  (id, project_id, engineer_id, total_value, duration_months,
   milestone_breakdown, is_awarded, awarded_at)
VALUES
  (boq_id, project_id, engineer_id, 4850000000, 18,
   'M1-Foundation:650000000|M2-GFSlab:820000000|M3-Blockwork:780000000|M4-Roofing:910000000|M5-Plastering:620000000|M6-Finishes:540000000|M7-MEP:530000000',
   TRUE, NOW() - INTERVAL '115 days');

-- ─────────────────────────────────────────
--  CONTRACT
-- ─────────────────────────────────────────
INSERT INTO contracts
  (id, project_id, lawyer_id, client_id, engineer_id, boq_id,
   status, contract_value, duration_months, defect_liability_months,
   lawyer_fee, client_signed_at, engineer_signed_at)
VALUES
  (contract_id, project_id, lawyer_id, client_id, engineer_id, boq_id,
   'active', 4850000000, 18, 12,
   48500000,   -- ₦485,000 (1% of ₦48.5M)
   NOW() - INTERVAL '112 days', NOW() - INTERVAL '112 days');

-- ─────────────────────────────────────────
--  MILESTONES
-- ─────────────────────────────────────────
INSERT INTO milestones
  (id, project_id, milestone_number, title, amount, status, funded_at, filed_at, completed_at, payment_released_at)
VALUES
  (m1_id, project_id, 1, 'M1 — Foundation',           650000000, 'completed', NOW()-INTERVAL'100d', NOW()-INTERVAL'75d', NOW()-INTERVAL'72d', NOW()-INTERVAL'70d'),
  (m2_id, project_id, 2, 'M2 — Ground Floor Slab',    820000000, 'completed', NOW()-INTERVAL'68d',  NOW()-INTERVAL'52d', NOW()-INTERVAL'50d', NOW()-INTERVAL'48d'),
  (m3_id, project_id, 3, 'M3 — Blockwork & Lintels',  780000000, 'completed', NOW()-INTERVAL'45d',  NOW()-INTERVAL'30d', NOW()-INTERVAL'27d', NOW()-INTERVAL'25d'),
  (m4_id, project_id, 4, 'M4 — Roofing',              910000000, 'filed',     NOW()-INTERVAL'20d',  NOW()-INTERVAL'2d',  NULL,                NULL),
  (m5_id, project_id, 5, 'M5 — Plastering',           620000000, 'pending_funding', NULL,           NULL,                NULL,                NULL);

-- ─────────────────────────────────────────
--  ESCROW TRANSACTIONS (completed ones)
-- ─────────────────────────────────────────
INSERT INTO escrow_transactions
  (project_id, milestone_id, payer_id, payee_id, type, status,
   gross_amount, platform_fee_pct, platform_fee, net_amount,
   held_at, released_at, released_by)
VALUES
  (project_id, m1_id, client_id, engineer_id, 'milestone', 'released', 650000000, 2.5, 16250000, 633750000, NOW()-INTERVAL'100d', NOW()-INTERVAL'70d', client_id),
  (project_id, m2_id, client_id, engineer_id, 'milestone', 'released', 820000000, 2.5, 20500000, 799500000, NOW()-INTERVAL'68d',  NOW()-INTERVAL'48d', client_id),
  (project_id, m3_id, client_id, engineer_id, 'milestone', 'released', 780000000, 2.5, 19500000, 760500000, NOW()-INTERVAL'45d',  NOW()-INTERVAL'25d', client_id),
  (project_id, m4_id, client_id, engineer_id, 'milestone', 'held',     910000000, 2.5, 22750000, 887250000, NOW()-INTERVAL'20d',  NULL, NULL);

-- ─────────────────────────────────────────
--  SUPPLIER INVENTORY
-- ─────────────────────────────────────────
INSERT INTO inventory (id, supplier_id, name, category, unit, unit_price, quantity_available)
VALUES
  (inv_id, supplier_id, 'Iron Rod Y16', 'iron', 'piece', 680000, 580),
  (uuid_generate_v4(), supplier_id, 'Iron Rod Y12', 'iron', 'piece', 420000, 940),
  (uuid_generate_v4(), supplier_id, 'BRC Mesh',     'iron', 'sheet', 2250000, 45),
  (uuid_generate_v4(), supplier_id, 'Dangote Cement 50kg', 'cement', 'bag', 1050000, 2000),
  (uuid_generate_v4(), supplier_id, 'Sharp Sand',   'aggregates', 'tonne', 850000, 100),
  (uuid_generate_v4(), supplier_id, 'Granite 3/4 inch', 'aggregates', 'tonne', 950000, 80);

-- ─────────────────────────────────────────
--  SUPPLIER ORDER
-- ─────────────────────────────────────────
INSERT INTO supplier_orders
  (id, project_id, client_id, supplier_id, order_reference, status,
   delivery_address, delivery_state, total_amount, placed_at, delivered_at)
VALUES
  (order_id, project_id, client_id, supplier_id, 'VT-2054', 'delivered',
   'Plot 18 GRA Extension, Abakaliki', 'Ebonyi', 210000000,   -- ₦2.1M
   NOW()-INTERVAL'10d', NOW()-INTERVAL'2d');

INSERT INTO order_items (order_id, inventory_id, item_name, unit, unit_price, quantity, line_total)
VALUES (order_id, inv_id, 'Iron Rod Y16', 'piece', 680000, 200, 136000000);

-- ─────────────────────────────────────────
--  CCTV CAMERAS
-- ─────────────────────────────────────────
INSERT INTO cctv_cameras (project_id, camera_label, position, is_active, deployed_at)
VALUES
  (project_id, 'CAM 01 — Front Elevation', 'Front of building, 3m height', TRUE, NOW()-INTERVAL'90d'),
  (project_id, 'CAM 02 — Roof Level',      'Scaffolding, roof level',       TRUE, NOW()-INTERVAL'90d');

-- ─────────────────────────────────────────
--  AI CCTV REPORT
-- ─────────────────────────────────────────
INSERT INTO cctv_reports
  (project_id, milestone_id, report_type, summary, observations,
   material_counts, completion_pct, worker_count, recommendation, generated_at)
VALUES
  (project_id, m4_id, 'milestone',
   'Roofing works on the 4-bed duplex at Plot 18 are substantially complete. Roof trusses fully installed and covered. No structural defects detected.',
   '1. All ridge capping joints sealed. 2. Gutter installation ~80% complete (northern elevation). 3. Scaffolding removal in progress. 4. Worker count averaged 9 on site between 09:00–16:00.',
   '{"cement_bags": 200, "iron_rods_y16": 58, "roofing_sheets": 120}',
   62, 9,
   'Milestone 4 (Roofing) confirmed substantially complete. Client may release escrow payment.',
   NOW()-INTERVAL'2d');

-- ─────────────────────────────────────────
--  NOTIFICATIONS
-- ─────────────────────────────────────────
INSERT INTO notifications (user_id, type, title, body, is_read)
VALUES
  (client_id, 'action_required', '🏁 Milestone Filed — Action Required',
   'M4 — Roofing has been filed as complete. Review the AI report and release escrow payment.', FALSE),
  (client_id, 'info', '📦 Delivery Confirmed',
   'Order VT-2054 (Iron Rod Y16 × 200) has been delivered to site. Confirm and release payment.', FALSE),
  (engineer_id, 'info', '💰 Milestone 3 Payment Released',
   'Escrow payment of ₦7,800,000 for M3 — Blockwork has been released to your account.', TRUE);

END $$;
