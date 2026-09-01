import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("leave decisions use the protected server endpoint", async () => {
  const page = await read("app/leave/team/page.tsx");
  const route = await read("app/api/leave/team/[requestId]/route.ts");
  assert.match(page, /fetch\(`\/api\/leave\/team\/\$\{decision\.id\}`/);
  assert.doesNotMatch(page, /\.from\(['"]leave_requests['"]\)\.update/);
  assert.match(route, /You cannot review your own leave request/);
  assert.match(route, /\.eq\('status', 'pending'\)/);
});

test("assessment scores are calculated on the server", async () => {
  const page = await read("app/quiz/page.tsx");
  const route = await read("app/api/training/ohsa-assessment/route.ts");
  assert.match(page, /\/api\/training\/ohsa-assessment/);
  assert.doesNotMatch(page, /from\(['"]quiz_attempts['"]\)/);
  assert.match(route, /answer === quiz\[index\]\.answer/);
  assert.match(route, /training_acknowledgements/);
});

test("new staff records are linked through auth_user_id", async () => {
  const route = await read("app/api/admin/staff/route.ts");
  assert.match(route, /auth_user_id: invited\.user\.id/);
  assert.match(route, /assignableRoles\(requestingRole\)/);
  assert.doesNotMatch(route, /\.insert\(\{\s*id:\s*invited\.user\.id/);
});

test("contracts must be opened before server-side signing", async () => {
  const route = await read("app/api/contracts/[contractId]/route.ts");
  assert.match(route, /Open and review the contract before signing it/);
  assert.match(route, /signed_file_path:access\.contract\.file_path/);
});

test("contract uploads use canonical content types for mobile files", async () => {
  const route = await read("app/api/admin/contracts/route.ts");
  assert.match(route, /CONTRACT_CONTENT_TYPES/);
  assert.match(route, /contentType,/);
  assert.doesNotMatch(route, /ALLOWED_CONTRACT_MIME_TYPES\.has\(file\.type\)/);
});

test("database migration removes overlapping leave policies", async () => {
  const migration = await read(
    "supabase/migrations/202608260001_audit_remediation.sql",
  );
  assert.match(migration, /tablename='leave_requests'/);
  assert.match(migration, /leave_update_authorised_not_self/);
  assert.match(migration, /revoke all on public\.leave_requests from anon/);
});

test("password recovery returns users to the set-password page", async () => {
  const login = await read("app/login/page.tsx");
  const setPassword = await read("app/set-password/page.tsx");
  const browserClient = await read("lib/supabase.ts");
  assert.match(login, /resetPasswordForEmail/);
  assert.match(login, /window\.location\.origin}\/set-password/);
  assert.match(login, /Forgot password/);
  assert.match(browserClient, /flowType: 'implicit'/);
  assert.match(setPassword, /verifyOtp/);
  assert.match(setPassword, /error_description/);
  assert.match(setPassword, /exchangeCodeForSession/);
  assert.match(setPassword, /updateUser\(\{ password \}\)/);
  assert.ok(setPassword.indexOf("getSession()") < setPassword.indexOf("exchangeCodeForSession"));
});

test("manager assignments consistently use Auth user IDs", async () => {
  const migration = await read(
    "supabase/migrations/202608270001_repair_manager_links.sql",
  );
  const assignments = await read("app/api/admin/manager-assignments/route.ts");
  const team = await read("app/api/leave/team/route.ts");
  const decision = await read("app/api/leave/team/[requestId]/route.ts");
  assert.match(migration, /e\.manager_id=\(select auth\.uid\(\)\)/);
  assert.match(
    assignments,
    /storedManagerAuthUserId = managerRecord\.auth_user_id/,
  );
  assert.match(team, /\.eq\('manager_id', user\.id\)/);
  assert.match(decision, /\.eq\('manager_id', user\.id\)/);
});

test("marking an employee as a leaver uses the protected removal endpoint", async () => {
  const page = await read("app/admin/page.tsx");
  const route = await read("app/api/admin/employees/[employeeId]/route.ts");
  assert.match(page, /status === "leaver"/);
  assert.match(page, /method: "DELETE"/);
  assert.match(page, /This cannot be undone/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /You cannot remove your own portal account/);
  assert.match(route, /admin\.auth\.admin\.deleteUser/);
  assert.match(route, /from\('employees'\)\.delete\(\)/);
});

test("staff without onboarding can be seen and deleted by HR", async () => {
  const compliance = await read("app/api/admin/compliance/route.ts");
  const page = await read("app/admin/page.tsx");
  assert.match(compliance, /status: 'not_started'/);
  assert.match(compliance, /staffResult\.data/);
  assert.match(page, /Delete employee/);
  assert.match(page, /handleEmployeeDelete/);
});
