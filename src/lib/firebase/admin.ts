import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
  type AppOptions
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { AdminConfigurationError } from "@/lib/firebase/admin-errors";

type AdminClients = {
  app: App;
  auth: Auth;
  db: Firestore;
};

let cachedClients: AdminClients | null = null;

function readFirebaseConfigProjectId() {
  const raw = process.env.FIREBASE_CONFIG?.trim();

  if (!raw || raw.startsWith("/")) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { projectId?: unknown };
    return typeof parsed.projectId === "string" && parsed.projectId.trim()
      ? parsed.projectId.trim()
      : null;
  } catch {
    return null;
  }
}

function normalizeLocalEmulatorEnv() {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim()) {
    const publicAuthEmulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST?.trim();

    if (publicAuthEmulatorHost) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = publicAuthEmulatorHost.replace(/^https?:\/\//, "");
    }
  }
}

function getLocalEmulatorProjectId() {
  return (
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    readFirebaseConfigProjectId() ||
    null
  );
}

function isUsingLocalEmulator() {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST?.trim() ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST?.trim()
  );
}

function readServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new AdminConfigurationError(
      "FIREBASE_SERVICE_ACCOUNT_KEY is present, but it is not valid JSON."
    );
  }
}

function getAdminCredentialConfig(): AppOptions {
  const serviceAccount = readServiceAccountFromEnv();

  if (serviceAccount) {
    return { credential: cert(serviceAccount) };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return { credential: applicationDefault() };
  }

  normalizeLocalEmulatorEnv();

  if (isUsingLocalEmulator()) {
    const projectId = getLocalEmulatorProjectId();

    if (projectId) {
      return { projectId };
    }
  }

  throw new AdminConfigurationError(
    "Missing Firebase Admin credentials. Add FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS to use live admin data, or set local Firebase emulator hosts for development."
  );
}

export function getFirebaseAdminClients(): AdminClients {
  if (cachedClients) {
    return cachedClients;
  }

  const app =
    getApps()[0] ??
    initializeApp({
      ...getAdminCredentialConfig()
    });

  cachedClients = {
    app,
    auth: getAuth(app),
    db: getFirestore(app)
  };

  return cachedClients;
}

export function isFirebaseAdminConfigured() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
      (isUsingLocalEmulator() && getLocalEmulatorProjectId())
  );
}
