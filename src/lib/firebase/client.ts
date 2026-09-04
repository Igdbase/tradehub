import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const requiredConfigEntries = Object.entries(firebaseConfig).filter(([, value]) => !value?.trim());
const missingConfigKeys = requiredConfigEntries.map(([key]) => key);

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let authEmulatorConnected = false;

function formatMissingKeys(keys: string[]) {
  return keys
    .map((key) => `NEXT_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (character) => `_${character}`).toUpperCase()}`)
    .join(", ");
}

export function getFirebaseClientConfigState() {
  return {
    configured: missingConfigKeys.length === 0,
    missingKeys: missingConfigKeys,
    errorMessage:
      missingConfigKeys.length === 0
        ? null
        : process.env.NODE_ENV === "development"
          ? `Firebase client config is incomplete. Add ${formatMissingKeys(missingConfigKeys)} to .env.local before using TradeHub auth.`
          : "Firebase client configuration is incomplete for this environment."
  } as const;
}

function connectLocalAuthEmulator(auth: Auth) {
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST?.trim();

  if (!emulatorHost || authEmulatorConnected || typeof window === "undefined") {
    return;
  }

  connectAuthEmulator(
    auth,
    emulatorHost.startsWith("http") ? emulatorHost : `http://${emulatorHost}`,
    { disableWarnings: true }
  );
  authEmulatorConnected = true;
}

export function getFirebaseAppClient() {
  const configState = getFirebaseClientConfigState();

  if (!configState.configured) {
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

export function getFirebaseAuthClient() {
  const app = getFirebaseAppClient();

  if (!app) {
    return null;
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(app);
    connectLocalAuthEmulator(firebaseAuth);
  }

  return firebaseAuth;
}
