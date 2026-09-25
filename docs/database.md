# Savrdh Credit Platform Database

Target Supabase project: savrdh-Website-CRM

Project ref: qngjmepksxavimwnhtqt

## Isolation

This CRM uses only the dedicated `scp_*` table namespace.

Existing `website_*`, `sfs_*`, `finance_*`, `scr01_*` and unrelated tables are not dependencies of this CRM.

## Core tables

- scp_profiles
- scp_customers
- scp_partners
- scp_leads
- scp_loan_applications
- scp_msme_financial_profiles
- scp_documents
- scp_credit_analyses
- scp_lenders
- scp_lender_products
- scp_lender_matches
- scp_lender_submissions
- scp_sanctions
- scp_financial_transactions
- scp_disbursements
- scp_commission_ledger
- scp_partner_referrals
- scp_tasks
- scp_notifications
- scp_business_rules
- scp_audit_logs
- scp_integration_events

## Financial controls

- Duplicate normalized transaction IDs are unique at DB level.
- Only Finance/Owner may verify financial transactions.
- Verified financial transactions are immutable.
- A loan cannot move to `disbursed` unless a verified disbursement record exists.
- Disbursements require a verified lender-disbursement transaction.
- Commission entries require a verified payment/disbursement basis.
- RLS is enabled for all `scp_*` tables.
- Anonymous table access is revoked.

## Migration strategy

All future Savrdh Credit Platform migrations must be scoped to `scp_*` objects only.

To migrate to another Supabase project later, replay the `scp_*` migrations and migrate only `scp_*` rows plus the dedicated documents bucket.
