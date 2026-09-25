# Savrdh Credit Platform

This repository is now designed as a **fully independent Cloudflare deployment**.

## Infrastructure

- Next.js + React + TypeScript
- Cloudflare Workers via OpenNext
- Cloudflare D1 for application/CRM data
- Cloudflare R2 for document storage
- No Supabase dependency
- No PostgreSQL dependency

## Role portals

Customer, Partner, Employee, Credit, Manager, Finance, Owner and future Lender.

## Financial control rules

- Employees and Partners cannot verify payments or disbursements.
- Only Finance or Owner can verify a pending financial transaction.
- UTR / transaction IDs are database-unique.
- Verified financial transactions are immutable.
- A loan becomes `disbursed` only after Finance/Owner verification of a lender-disbursement transaction.
- Commission creation requires a verified lender-disbursement transaction.
- Sensitive finance actions are written to `scp_audit_log`.

## Cloudflare setup

Create two resources in the same Cloudflare account:

1. D1 database named `savrdh-credit-db`
2. R2 bucket named `savrdh-credit-documents`

Put the D1 database ID into `wrangler.jsonc`.

Apply migrations:

```bash
npm install
npm run db:migrate:remote
```

Deploy:

```bash
npm run deploy
```

For Cloudflare Git deployments, keep the project connected to this repository and configure the OpenNext build/deploy flow.

## Database

The D1 schema lives in:

`db/migrations/001_core_credit_platform.sql`

It contains the isolated CRM tables for users, customers, partners, MSME profiles, loan applications, documents, credit analysis, lenders/products, lender matching, submissions, financial transactions, commissions, referrals, notifications, business rules, audit logs and integration events.

## Future integrations

External services remain behind adapter contracts so bureau, GST, banking/AA, KYC, WhatsApp, eSign and lender APIs can be added without redesigning the core database.
