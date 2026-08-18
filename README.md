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
Run `supabase/schema.sql` in the Supabase SQL editor.

The UI currently uses seed/demo data so it renders before Supabase authentication is wired in. The next implementation step is Supabase Auth + replacing demo status values with live employee records.
