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
    "Missing Firebase Admin credentials. Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local or set GOOGLE_APPLICATION_CREDENTIALS before running firebase:bootstrap-student."
  );
}

function validateWorkspaceId(workspaceId) {
  return /^ws_[a-z0-9_]{2,60}$/.test(workspaceId);
}

function validateTierId(tierId) {
  return tierId === "all" || /^tier_[a-z0-9_]{2,80}$/.test(tierId);
}

function titleCase(value) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function inferDisplayName(email) {
  const localPart = email.split("@")[0] ?? "student";
  return titleCase(localPart) || "Student";
}

function inferTierLabel(tierId) {
  if (tierId === "all") {
    return "All tiers";
  }

  return titleCase(tierId.replace(/^tier_/, "")) || "Active tier";
}

async function main() {
  loadLocalEnvironment();

  const studentEmail = process.env.STUDENT_EMAIL?.trim().toLowerCase();
  const workspaceId = process.env.STUDENT_WORKSPACE_ID?.trim();
  const tierId = process.env.STUDENT_TIER_ID?.trim() || "all";

  if (!studentEmail) {
    fail(
      "Missing STUDENT_EMAIL. Add the student email to .env.local before running firebase:bootstrap-student."
    );
  }

  if (!workspaceId) {
    fail(
      "Missing STUDENT_WORKSPACE_ID. Add the prepared workspace ID, such as ws_idris, before running firebase:bootstrap-student."
    );
  }

  if (!validateWorkspaceId(workspaceId)) {
    fail("STUDENT_WORKSPACE_ID should look like ws_idris.");
  }

  if (!validateTierId(tierId)) {
    fail('STUDENT_TIER_ID should be "all" or look like tier_starter.');
  }

  const app =
    getApps()[0] ??
    initializeApp({
      ...getAdminCredentialConfig()
    });
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    const user = await auth.getUserByEmail(studentEmail);
    const existingClaims = user.customClaims ?? {};
    const studentId =
      typeof existingClaims.studentId === "string" && existingClaims.studentId.trim()
        ? existingClaims.studentId
        : user.uid;

    await auth.setCustomUserClaims(user.uid, {
      ...existingClaims,
      role: "student",
      workspaceId,
      studentId,
      tierId
    });

    const studentRef = db.doc(`workspaces/${workspaceId}/students/${studentId}`);
    const existingStudentSnapshot = await studentRef.get();
    const existingStudent = existingStudentSnapshot.data() ?? {};
    const now = new Date().toISOString();

    await studentRef.set(
      {
        studentId,
        workspaceId,
        displayName:
          typeof existingStudent.displayName === "string" && existingStudent.displayName.trim()
            ? existingStudent.displayName
            : inferDisplayName(studentEmail),
        email: studentEmail,
        tierId,
        tierLabel:
          typeof existingStudent.tierLabel === "string" && existingStudent.tierLabel.trim()
            ? existingStudent.tierLabel
            : inferTierLabel(tierId),
        status: typeof existingStudent.status === "string" ? existingStudent.status : "active",
        paymentRail:
          typeof existingStudent.paymentRail === "string" ? existingStudent.paymentRail : "manual",
        joinedAt:
          typeof existingStudent.joinedAt === "string" && existingStudent.joinedAt.trim()
            ? existingStudent.joinedAt
            : now,
        courseCompletionPercent:
          typeof existingStudent.courseCompletionPercent === "number"
            ? existingStudent.courseCompletionPercent
            : 0,
        signalAccess:
          typeof existingStudent.signalAccess === "boolean" ? existingStudent.signalAccess : true,
        autoCopyEligible:
          typeof existingStudent.autoCopyEligible === "boolean"
            ? existingStudent.autoCopyEligible
            : false
      },
      { merge: true }
    );

    console.log(
      `Student claim set for ${studentEmail} on workspace ${workspaceId} with tier ${tierId}.`
    );
    console.log(
      `Student record ensured at workspaces/${workspaceId}/students/${studentId}.`
    );
    console.log(
      "Ask the student to sign out and back in, or refresh session claims, before opening /app/courses."
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = String(error.code);

      if (code === "auth/user-not-found") {
        fail(
          `No Firebase Auth user exists for ${studentEmail}. Create the Email/Password account first, then rerun firebase:bootstrap-student.`
        );
      }
    }

    fail(error instanceof Error ? error.message : "Failed to bootstrap the student user.");
  }
}

main();
