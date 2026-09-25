-- Savrdh Credit Platform - Cloudflare D1 schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS scp_users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('customer','partner','employee','credit','manager','finance','owner','lender')),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  mobile TEXT,
  password_hash TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scp_customers (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES scp_users(id),
  customer_type TEXT NOT NULL CHECK(customer_type IN ('individual','proprietor','partnership','llp','company','other')),
  pan TEXT,
  gstin TEXT,
  legal_name TEXT NOT NULL,
  constitution TEXT,
  created_by TEXT REFERENCES scp_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scp_partners (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES scp_users(id),
  partner_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  payout_profile TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scp_msme_financial_profiles (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES scp_customers(id) ON DELETE CASCADE,
  financial_year TEXT NOT NULL,
  turnover REAL,
  gross_profit REAL,
  net_profit REAL,
  depreciation REAL,
  existing_debt REAL,
  monthly_obligation REAL,
  bank_credit_total REAL,
  bank_debit_total REAL,
  gst_turnover REAL,
  source_snapshot TEXT NOT NULL DEFAULT '{}',
  verified_at TEXT,
  verified_by TEXT REFERENCES scp_users(id),
  UNIQUE(customer_id, financial_year)
);

CREATE TABLE IF NOT EXISTS scp_loan_applications (
  id TEXT PRIMARY KEY,
  application_no TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES scp_customers(id),
  referred_by_partner_id TEXT REFERENCES scp_partners(id),
  assigned_employee_id TEXT REFERENCES scp_users(id),
  assigned_credit_user_id TEXT REFERENCES scp_users(id),
  assigned_manager_id TEXT REFERENCES scp_users(id),
  product_type TEXT NOT NULL,
  requested_amount REAL NOT NULL CHECK(requested_amount > 0),
  tenure_months INTEGER,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN (
    'draft','submitted','under_review','credit_review','matched','submitted_to_lender',
    'sanctioned','disbursement_pending_verification','disbursed','rejected','cancelled'
  )),
  sanctioned_amount REAL,
  sanctioned_at TEXT,
  legacy_deal_id TEXT,
  created_by TEXT NOT NULL REFERENCES scp_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scp_documents (
  id TEXT PRIMARY KEY,
  application_id TEXT REFERENCES scp_loan_applications(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES scp_customers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT,
  checksum_sha256 TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_by TEXT REFERENCES scp_users(id),
  verified_at TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  uploaded_by TEXT NOT NULL REFERENCES scp_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scp_credit_analyses (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES scp_loan_applications(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  bureau_summary TEXT NOT NULL DEFAULT '{}',
  banking_summary TEXT NOT NULL DEFAULT '{}',
  gst_summary TEXT NOT NULL DEFAULT '{}',
  ratios TEXT NOT NULL DEFAULT '{}',
  risk_flags TEXT NOT NULL DEFAULT '[]',
  recommendation TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL REFERENCES scp_users(id),
  verified_by TEXT REFERENCES scp_users(id),
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(application_id, version)
);

CREATE TABLE IF NOT EXISTS scp_lenders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  lender_type TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  integration_mode TEXT NOT NULL DEFAULT 'manual',
  config TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scp_lender_products (
  id TEXT PRIMARY KEY,
  lender_id TEXT NOT NULL REFERENCES scp_lenders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_code TEXT NOT NULL,
  min_amount REAL,
  max_amount REAL,
  min_tenure_months INTEGER,
  max_tenure_months INTEGER,
  min_score INTEGER,
  rules TEXT NOT NULL DEFAULT '{}',
  commission_rule TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  UNIQUE(lender_id, product_code)
);

CREATE TABLE IF NOT EXISTS scp_lender_matches (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES scp_loan_applications(id) ON DELETE CASCADE,
  lender_product_id TEXT NOT NULL REFERENCES scp_lender_products(id),
  match_score REAL,
  reasons TEXT NOT NULL DEFAULT '[]',
  rule_snapshot TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL REFERENCES scp_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(application_id, lender_product_id)
);

CREATE TABLE IF NOT EXISTS scp_lender_submissions (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES scp_loan_applications(id),
  lender_product_id TEXT NOT NULL REFERENCES scp_lender_products(id),
  external_reference TEXT,
  status TEXT NOT NULL DEFAULT 'prepared',
  submitted_at TEXT,
  submitted_by TEXT REFERENCES scp_users(id),
  response_snapshot TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scp_financial_transactions (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES scp_loan_applications(id),
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('customer_payment','lender_disbursement','refund','commission_payout','adjustment')),
  amount REAL NOT NULL CHECK(amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  utr_or_transaction_id TEXT NOT NULL UNIQUE,
  transaction_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected','reversed')),
  source TEXT NOT NULL DEFAULT 'manual',
  evidence_document_id TEXT REFERENCES scp_documents(id),
  created_by TEXT NOT NULL REFERENCES scp_users(id),
  verified_by TEXT REFERENCES scp_users(id),
  verified_at TEXT,
  verification_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scp_commission_ledger (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES scp_loan_applications(id),
  source_transaction_id TEXT NOT NULL REFERENCES scp_financial_transactions(id),
  beneficiary_type TEXT NOT NULL CHECK(beneficiary_type IN ('partner','employee','company')),
  beneficiary_id TEXT,
  basis_amount REAL NOT NULL,
  rate REAL NOT NULL DEFAULT 0 CHECK(rate >= 0),
  commission_amount REAL NOT NULL,
  rule_snapshot TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'accrued',
  approved_by TEXT REFERENCES scp_users(id),
  approved_at TEXT,
  paid_transaction_id TEXT REFERENCES scp_financial_transactions(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_transaction_id, beneficiary_type, beneficiary_id)
);

CREATE TABLE IF NOT EXISTS scp_referrals (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES scp_partners(id),
  application_id TEXT NOT NULL REFERENCES scp_loan_applications(id),
  referral_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(partner_id, application_id)
);

CREATE TABLE IF NOT EXISTS scp_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES scp_users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  template_key TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scp_business_rules (
  id TEXT PRIMARY KEY,
  rule_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  scope TEXT NOT NULL DEFAULT 'global',
  definition TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  valid_from TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_to TEXT,
  created_by TEXT NOT NULL REFERENCES scp_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(rule_key, version)
);

CREATE TABLE IF NOT EXISTS scp_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id TEXT REFERENCES scp_users(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_data TEXT,
  after_data TEXT,
  correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scp_integration_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  request_payload TEXT NOT NULL DEFAULT '{}',
  response_payload TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  provider_reference TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TRIGGER IF NOT EXISTS scp_block_verified_financial_update
BEFORE UPDATE ON scp_financial_transactions
WHEN OLD.status = 'verified' AND (
  NEW.amount <> OLD.amount OR
  NEW.utr_or_transaction_id <> OLD.utr_or_transaction_id OR
  NEW.application_id <> OLD.application_id OR
  NEW.transaction_type <> OLD.transaction_type OR
  COALESCE(NEW.transaction_date,'') <> COALESCE(OLD.transaction_date,'') OR
  NEW.status <> OLD.status
)
BEGIN
  SELECT RAISE(ABORT, 'Verified financial transactions are immutable');
END;

CREATE INDEX IF NOT EXISTS scp_app_status_idx ON scp_loan_applications(status);
CREATE INDEX IF NOT EXISTS scp_app_employee_idx ON scp_loan_applications(assigned_employee_id);
CREATE INDEX IF NOT EXISTS scp_tx_app_idx ON scp_financial_transactions(application_id);
CREATE INDEX IF NOT EXISTS scp_tx_status_idx ON scp_financial_transactions(status);
CREATE INDEX IF NOT EXISTS scp_audit_entity_idx ON scp_audit_log(entity_type, entity_id);
