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
2. Copy `.env.example` to `.env.local`
3. `npm run dev`

## Supabase
The portal uses Supabase Auth, the existing `employees` table and the onboarding/training tables.

To enable **Admin → Add New Staff**, configure these server-side Vercel variables:

- `SUPABASE_SERVICE_ROLE_KEY` (never expose this as a `NEXT_PUBLIC_` variable)
- `ADMIN_EMAILS` (comma-separated manager email addresses)
- `NEXT_PUBLIC_SITE_URL` (the deployed portal URL used by the invitation email)

Managers may alternatively be authorised with an `admin`, `manager`, `hr_admin` or `compliance_admin` role in Supabase Auth app metadata or the existing `profiles.role` field. New employees receive a Supabase invitation email and are linked to `employees.auth_user_id` automatically.
