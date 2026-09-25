# Savrdh Credit Platform

Production Next.js financial CRM and digital credit marketplace.

## Primary deployment: Vercel

The web application is configured to deploy directly on Vercel.

- Framework: Next.js
- Root Directory: repository root
- Install Command: `npm install`
- Build Command: `npm run build`
- Output: `.next`
- Recommended Node.js: 22.x

A `vercel.json` file is included so Vercel can use the correct settings without Cloudflare-specific build commands.

## Optional Cloudflare backend/runtime

Cloudflare-specific tooling remains available only as optional scripts:

- `npm run cf:build`
- `npm run cf:deploy`
- `npm run cf:preview`

The browser/Next.js application no longer initializes the Cloudflare runtime from `next.config.ts`, so Vercel builds stay clean.

Cloudflare D1/R2-specific access lives behind `src/lib/cloudflare-db.ts`. The Vercel app should reach Cloudflare data through a secure API boundary rather than importing D1 bindings directly.

## Portals

Customer, Partner, Employee, Credit, Manager, Finance, Owner and future Lender.

## Financial control rules

- Employees and Partners cannot verify payments or disbursements.
- Only Finance or Owner can verify a pending financial transaction.
- Duplicate UTR / transaction IDs are blocked at the data layer.
- Verified financial transactions are immutable.
- Commission calculation is based only on verified disbursement/payment records.
- Sensitive finance actions are audited.

## Cloudflare D1 migration

The isolated D1 schema remains in:

`db/migrations/001_core_credit_platform.sql`

Supabase is not used.
