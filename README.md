# Isitha Global Staff Onboarding Portal

Starter Next.js portal for live employee onboarding, training, acknowledgements, OHSA assessment and HR compliance monitoring.

## Included
- Employee dashboard
- Live HR & Employment Training
- Live 10-module OHSA Awareness Training
- Emergency & Office Induction
- OHSA knowledge assessment (80% pass mark)
- HR compliance dashboard prototype
- Supabase schema with training versioning and acknowledgements

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in every value
3. Apply the committed files in `supabase/migrations` to the matching Supabase project
4. Run `npm run check`
5. Run `npm run dev`

## Supabase
The portal uses Supabase Auth, the existing `employees` table and the onboarding/training tables.

To enable **Admin → Add New Staff**, configure these server-side Vercel variables:

- `SUPABASE_SERVICE_ROLE_KEY` (never expose this as a `NEXT_PUBLIC_` variable)
- `ADMIN_EMAILS` (comma-separated manager email addresses)
- `NEXT_PUBLIC_SITE_URL` (the deployed portal URL used by the invitation email)

Portal authorisation uses one canonical role held in Supabase Auth app metadata: `staff`, `manager`, `hr_admin`, `compliance_admin` or `admin`. `ADMIN_EMAILS` is the emergency owner allow-list. Managers may create staff accounts only; only an administrator can grant administrator or compliance access. New employees receive a Supabase invitation email and are linked to `employees.auth_user_id` automatically.

## Audit remediation

The 22 August 2026 audit repairs are versioned in `supabase/migrations/202608260001_audit_remediation.sql`. The migration backfills missing login links, replaces overlapping leave policies, prevents self-approval, locks assessment writes to trusted server code, enables authorised medical-certificate access and adds privacy-request records. Apply it before deploying the matching application release.
