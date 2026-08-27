import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('leave decisions use the protected server endpoint', async () => {
  const page = await read('app/leave/team/page.tsx');
  const route = await read('app/api/leave/team/[requestId]/route.ts');
  assert.match(page, /fetch\(`\/api\/leave\/team\/\$\{decision\.id\}`/);
  assert.doesNotMatch(page, /\.from\(['"]leave_requests['"]\)\.update/);
  assert.match(route, /You cannot review your own leave request/);
  assert.match(route, /\.eq\('status', 'pending'\)/);
});

test('assessment scores are calculated on the server', async () => {
  const page = await read('app/quiz/page.tsx');
  const route = await read('app/api/training/ohsa-assessment/route.ts');
  assert.match(page, /\/api\/training\/ohsa-assessment/);
  assert.doesNotMatch(page, /from\(['"]quiz_attempts['"]\)/);
  assert.match(route, /answer === quiz\[index\]\.answer/);
  assert.match(route, /training_acknowledgements/);
});

test('new staff records are linked through auth_user_id', async () => {
  const route = await read('app/api/admin/staff/route.ts');
  assert.match(route, /auth_user_id: invited\.user\.id/);
  assert.match(route, /assignableRoles\(requestingRole\)/);
  assert.doesNotMatch(route, /\.insert\(\{\s*id:\s*invited\.user\.id/);
});

test('contracts must be opened before server-side signing', async () => {
  const route = await read('app/api/contracts/[contractId]/route.ts');
  assert.match(route, /Open and review the contract before signing it/);
  assert.match(route, /signed_file_path:access\.contract\.file_path/);
});

test('database migration removes overlapping leave policies', async () => {
  const migration = await read('supabase/migrations/202608260001_audit_remediation.sql');
  assert.match(migration, /tablename='leave_requests'/);
  assert.match(migration, /leave_update_authorised_not_self/);
  assert.match(migration, /revoke all on public\.leave_requests from anon/);
});

test('password recovery returns users to the set-password page', async () => {
  const login = await read('app/login/page.tsx');
  const setPassword = await read('app/set-password/page.tsx');
  assert.match(login, /resetPasswordForEmail/);
  assert.match(login, /window\.location\.origin}\/set-password/);
  assert.match(login, /Forgot password/);
  assert.match(setPassword, /exchangeCodeForSession/);
  assert.match(setPassword, /updateUser\(\{ password \}\)/);
});

test('legacy manager links are repaired through employee identities', async () => {
  const migration = await read('supabase/migrations/202608270001_repair_manager_links.sql');
  assert.match(migration, /employee\.manager_id = manager\.auth_user_id/);
  assert.match(migration, /set manager_id = manager\.id/);
  assert.match(migration, /employee\.id <> manager\.id/);
});
