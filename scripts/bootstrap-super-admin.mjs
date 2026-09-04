import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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
  } catch (error) {
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
    "Missing Firebase Admin credentials. Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local or set GOOGLE_APPLICATION_CREDENTIALS before running firebase:bootstrap-super-admin."
  );
}

async function main() {
  loadLocalEnvironment();

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim();

  if (!superAdminEmail) {
    fail(
      "Missing SUPER_ADMIN_EMAIL. Add the first owner email to .env.local before running firebase:bootstrap-super-admin."
    );
  }

  const app =
    getApps()[0] ??
    initializeApp({
      ...getAdminCredentialConfig()
    });

  const auth = getAuth(app);

  try {
    const user = await auth.getUserByEmail(superAdminEmail);
    const existingClaims = user.customClaims ?? {};

    await auth.setCustomUserClaims(user.uid, {
      ...existingClaims,
      role: "super_admin"
    });

    console.log(`Super Admin claim set for ${superAdminEmail}.`);
    console.log("Sign out and back in, or refresh session claims, before reopening /admin.");
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = String(error.code);

      if (code === "auth/user-not-found") {
        fail(
          `No Firebase Auth user exists for ${superAdminEmail}. Create the Email/Password account first, then rerun firebase:bootstrap-super-admin.`
        );
      }
    }

    fail(error instanceof Error ? error.message : "Failed to bootstrap the Super Admin user.");
  }
}

main();
