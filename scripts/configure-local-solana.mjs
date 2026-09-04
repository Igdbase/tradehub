import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
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
    "Missing Firebase Admin credentials. Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local or set GOOGLE_APPLICATION_CREDENTIALS before running this script."
  );
}

function isLikelyPublicKey(value) {
  return typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(value);
}

function readFlag(name) {
  const index = process.argv.indexOf(name);

  if (index < 0) {
    return "";
  }

  return process.argv[index + 1]?.trim() ?? "";
}

function updateRail(rails, rail, patch) {
  const current =
    rails.find((entry) => entry?.rail === rail) ??
    {
      rail,
      status: "disabled",
      label: rail === "paystack" ? "Paystack local checkout" : "Optional Solana Pay / USDC",
      settlementNote: ""
    };
  const next = {
    ...current,
    ...patch,
    rail
  };
  const others = rails.filter((entry) => entry?.rail !== rail);

  return rail === "paystack" ? [next, ...others] : [...others, next];
}

async function main() {
  loadLocalEnvironment();

  const workspaceId = readFlag("--workspace") || process.env.INFLUENCER_WORKSPACE_ID?.trim() || "";
  const payoutWallet = readFlag("--payout-wallet");
  const splitPercentRaw = readFlag("--platform-split") || "10";
  const platformSplitPercent = Number(splitPercentRaw);

  if (!workspaceId) {
    fail("Missing workspace ID. Pass --workspace ws_example or set INFLUENCER_WORKSPACE_ID in .env.local.");
  }

  if (!isLikelyPublicKey(payoutWallet)) {
    fail("Pass a valid public Solana payout wallet with --payout-wallet <PUBKEY>.");
  }

  if (!Number.isFinite(platformSplitPercent) || platformSplitPercent < 0 || platformSplitPercent > 100) {
    fail("Platform split must be a number between 0 and 100.");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      ...getAdminCredentialConfig()
    });
  const db = getFirestore(app);
  const workspaceRef = db.doc(`workspaces/${workspaceId}`);
  const snapshot = await workspaceRef.get();

  if (!snapshot.exists) {
    fail(`Workspace ${workspaceId} does not exist.`);
  }

  const workspace = snapshot.data() ?? {};
  const rails = Array.isArray(workspace.rails) ? workspace.rails : [];
  const nextRails = updateRail(rails, "solana", {
    status: "enabled",
    label: "Optional Solana Pay / USDC",
    settlementNote: "Local validator test mode is enabled for this workspace."
  });
  const now = new Date().toISOString();

  await workspaceRef.set(
    {
      vettingStatus: "approved",
      solanaPayEnabled: true,
      solanaPayoutWallet: payoutWallet,
      platformSplitPercent,
      rails: nextRails,
      updatedAt: now
    },
    { merge: true }
  );

  console.log(`Workspace ${workspaceId} is Solana-ready for local testing.`);
  console.log(`Payout wallet: ${payoutWallet}`);
  console.log(`Platform split percent: ${platformSplitPercent}`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Failed to configure local Solana readiness.");
});
