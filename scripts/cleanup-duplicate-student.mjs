import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();

  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, "\"");
  }

  return value;
}

function loadEnvFile(filename) {
  const filePath = path.join(rootDir, filename);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1);

    if (!process.env[key]) {
      process.env[key] = parseEnvValue(rawValue);
    }
  }
}

function loadLocalEnvironment() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

function readServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    fail(
      "FIREBASE_SERVICE_ACCOUNT_KEY is present, but it is not valid JSON. Paste the service account JSON as a single-line string in .env.local."
    );
  }
}

function getAdminCredentialConfig() {
  const serviceAccount = readServiceAccountFromEnv();

  if (serviceAccount) {
    return { credential: cert(serviceAccount) };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { credential: applicationDefault() };
  }

  fail(
    "Missing Firebase Admin credentials. Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local or set GOOGLE_APPLICATION_CREDENTIALS before running cleanup."
  );
}

function parseArguments(argv) {
  const args = {
    workspaceId: "",
    email: "",
    confirm: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];

    if (entry === "--workspace" || entry === "-w") {
      args.workspaceId = (argv[index + 1] ?? "").trim();
      index += 1;
      continue;
    }

    if (entry === "--email" || entry === "-e") {
      args.email = (argv[index + 1] ?? "").trim().toLowerCase();
      index += 1;
      continue;
    }

    if (entry === "--confirm") {
      args.confirm = true;
    }
  }

  return args;
}

function validateWorkspaceId(workspaceId) {
  return /^ws_[a-z0-9_]{2,60}$/.test(workspaceId);
}

function stringifyRecord(record) {
  return JSON.stringify(record, null, 2);
}

async function main() {
  loadLocalEnvironment();

  const parsed = parseArguments(process.argv.slice(2));
  const workspaceId = parsed.workspaceId || process.env.STUDENT_WORKSPACE_ID?.trim() || "";
  const studentEmail =
    parsed.email || process.env.STUDENT_EMAIL?.trim().toLowerCase() || "";

  if (!studentEmail) {
    fail("Missing student email. Run with --email student@example.com.");
  }

  if (!workspaceId) {
    fail("Missing workspace ID. Run with --workspace ws_idris.");
  }

  if (!validateWorkspaceId(workspaceId)) {
    fail("Workspace ID should look like ws_idris.");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      ...getAdminCredentialConfig()
    });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const user = await auth.getUserByEmail(studentEmail).catch((error) => {
    fail(error instanceof Error ? error.message : `No auth user exists for ${studentEmail}.`);
  });

  const claims = user.customClaims ?? {};
  const keeperStudentId =
    typeof claims.studentId === "string" && claims.studentId.trim()
      ? claims.studentId.trim()
      : user.uid;

  const studentsSnapshot = await db.collection(`workspaces/${workspaceId}/students`).get();
  const matchingStudents = studentsSnapshot.docs
    .map((snapshot) => ({
      studentId: snapshot.id,
      path: snapshot.ref.path,
      data: snapshot.data()
    }))
    .filter((entry) => {
      const email = typeof entry.data.email === "string" ? entry.data.email.trim().toLowerCase() : "";
      return email === studentEmail;
    });

  if (matchingStudents.length === 0) {
    fail(`No student records found in workspaces/${workspaceId}/students for ${studentEmail}.`);
  }

  const keeper = matchingStudents.find((entry) => entry.studentId === keeperStudentId);

  if (!keeper) {
    fail(
      `Found ${matchingStudents.length} student record(s) for ${studentEmail}, but none match the active auth studentId ${keeperStudentId}. Aborting without changes.`
    );
  }

  const staleDuplicates = matchingStudents.filter((entry) => entry.studentId !== keeperStudentId);

  console.log(`Workspace: ${workspaceId}`);
  console.log(`Student email: ${studentEmail}`);
  console.log(`Auth user uid: ${user.uid}`);
  console.log(`Keeper studentId: ${keeperStudentId}`);
  console.log("Keeper record:");
  console.log(stringifyRecord({ studentId: keeper.studentId, path: keeper.path, data: keeper.data }));

  if (staleDuplicates.length === 0) {
    console.log("No stale duplicate student records were found. Nothing to clean up.");
    return;
  }

  console.log(`Found ${staleDuplicates.length} stale duplicate record(s):`);
  for (const duplicate of staleDuplicates) {
    console.log(stringifyRecord({ studentId: duplicate.studentId, path: duplicate.path, data: duplicate.data }));
  }

  if (!parsed.confirm) {
    console.log("Dry run only. Re-run with --confirm to delete the stale duplicate record(s).");
    return;
  }

  for (const duplicate of staleDuplicates) {
    await db.recursiveDelete(db.doc(duplicate.path));
    console.log(`Deleted duplicate student tree: ${duplicate.path}`);
  }

  const remainingSnapshot = await db.collection(`workspaces/${workspaceId}/students`).get();
  const remainingMatches = remainingSnapshot.docs
    .map((snapshot) => ({
      studentId: snapshot.id,
      email: typeof snapshot.data().email === "string" ? snapshot.data().email.trim().toLowerCase() : ""
    }))
    .filter((entry) => entry.email === studentEmail);

  console.log(`Cleanup complete. Remaining records for ${studentEmail}: ${remainingMatches.length}`);
  console.log(stringifyRecord(remainingMatches));
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Failed to clean up duplicate student records.");
});
