import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { STAGE15F_PROJECT_ID, ids } from "./stage15f-paper-beta-fixtures.mjs";

const DEFAULT_PASSWORD = "Stage15F!Pass123";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function configureEmulatorSafety() {
  if (process.env.TRADEHUB_ALLOW_LIVE_STAGE15F_AUTH_SEED === "true") {
    fail("Stage 15F auth seed refuses live Auth writes. Use the Firebase Auth emulator.");
  }

  process.env.GCLOUD_PROJECT ||= STAGE15F_PROJECT_ID;
  process.env.FIREBASE_CONFIG ||= JSON.stringify({ projectId: STAGE15F_PROJECT_ID });
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
}

async function upsertUser(auth, user) {
  try {
    await auth.updateUser(user.uid, {
      email: user.email,
      password: user.password,
      displayName: user.displayName,
      emailVerified: true,
      disabled: false
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && error.code === "auth/user-not-found") {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        emailVerified: true,
        disabled: false
      });
    } else {
      throw error;
    }
  }

  await auth.setCustomUserClaims(user.uid, user.claims);
}

function studentUser(studentId) {
  return {
    uid: studentId,
    email: `${studentId}@example.test`,
    password: DEFAULT_PASSWORD,
    displayName: studentId.replace(/^student_stage15f_/, "").replace(/_/g, " "),
    claims: {
      role: "student",
      workspaceId: ids.workspaceId,
      studentId,
      tierId: "pro_auto_copy"
    }
  };
}

configureEmulatorSafety();

const app = getApps()[0] ?? initializeApp({ projectId: STAGE15F_PROJECT_ID });
const auth = getAuth(app);

const users = [
  {
    uid: ids.influencerId,
    email: "stage15f.influencer@example.test",
    password: DEFAULT_PASSWORD,
    displayName: "Crypto Auto-Copy Influencer",
    claims: {
      role: "influencer",
      workspaceId: ids.workspaceId
    }
  },
  {
    uid: "super_admin_stage15f",
    email: "stage15f.admin@example.test",
    password: DEFAULT_PASSWORD,
    displayName: "Crypto Auto-Copy Super Admin",
    claims: {
      role: "super_admin"
    }
  },
  ...Object.values(ids.students).map(studentUser)
];

for (const user of users) {
  await upsertUser(auth, user);
}

console.log("Stage 15F Auth emulator users seeded.");
console.log(`Project: ${STAGE15F_PROJECT_ID}`);
console.log(`Auth emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
console.log(`Password for all seeded users: ${DEFAULT_PASSWORD}`);
console.log("Users:");
for (const user of users) {
  console.log(`  ${user.email} -> ${JSON.stringify(user.claims)}`);
}
