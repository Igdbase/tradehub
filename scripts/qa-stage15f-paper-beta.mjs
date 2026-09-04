import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  STAGE15F_PROJECT_ID,
  ids,
  isoMinutes
} from "./stage15f-paper-beta-fixtures.mjs";

function fail(message) {
  throw new Error(message);
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function configureEmulator() {
  process.env.GCLOUD_PROJECT ||= STAGE15F_PROJECT_ID;
  process.env.FIREBASE_CONFIG ||= JSON.stringify({ projectId: STAGE15F_PROJECT_ID });
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
}

async function getRequired(path) {
  const snapshot = await db.doc(path).get();

  if (!snapshot.exists) {
    fail(`Missing required fixture: ${path}`);
  }

  return snapshot.data();
}

async function listCollection(path) {
  const snapshot = await db.collection(path).limit(100).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }

  pass(message);
}

function tierIncludesAutoCopy(workspace, tierId) {
  return workspace.tiers
    .find((tier) => tier.tierId === tierId)
    ?.features
    ?.includes("autoCopy") === true;
}

async function assertNoIntentForStudent(studentId) {
  const intents = await listCollection(`workspaces/${ids.workspaceId}/execution_intents`);
  assert(
    !intents.some((intent) => intent.studentId === studentId && intent.status === "ready_for_paper"),
    `${studentId} has no ready_for_paper intent`
  );
}

async function assertRiskDecision(decisionId, expected) {
  const decision = await getRequired(`workspaces/${ids.workspaceId}/risk_decisions/${decisionId}`);

  assert(decision.status === expected.status, `${decisionId} status is ${expected.status}`);

  if (expected.failedCheckKey) {
    assert(
      Array.isArray(decision.checks) &&
        decision.checks.some((check) => check.key === expected.failedCheckKey && check.status === "blocked"),
      `${decisionId} includes blocked ${expected.failedCheckKey} check`
    );
  }
}

async function resetWorkerFixtures() {
  await Promise.all([
    db.doc(`workspaces/${ids.workspaceId}/execution_intents/${ids.intents.workerCandidate}`).set(
      {
        status: "ready_for_paper",
        paperTradingOnly: true,
        updatedAt: isoMinutes(-2)
      },
      { merge: true }
    ),
    db.doc(`workspaces/${ids.workspaceId}/execution_intents/${ids.intents.nonPaperReady}`).set(
      {
        status: "ready_for_paper",
        paperTradingOnly: false,
        updatedAt: isoMinutes(-1)
      },
      { merge: true }
    ),
    db.doc(`workspaces/${ids.workspaceId}/order_attempts/attempt_${ids.intents.workerCandidate}_1`).delete(),
    db.doc(`workspaces/${ids.workspaceId}/order_attempts/attempt_${ids.intents.nonPaperReady}_1`).delete()
  ]);
}

async function runPaperWorkerFixture() {
  const candidateIds = [ids.intents.workerCandidate, ids.intents.nonPaperReady];
  let completedPaperCount = 0;
  let skippedCount = 0;

  for (const intentId of candidateIds) {
    const intentRef = db.doc(`workspaces/${ids.workspaceId}/execution_intents/${intentId}`);
    const intent = (await intentRef.get()).data();

    if (!intent) {
      fail(`Missing worker candidate ${intentId}`);
    }

    if (intent.status !== "ready_for_paper" || intent.paperTradingOnly !== true) {
      await db.collection(`workspaces/${ids.workspaceId}/execution_audit_events`).doc(`audit_stage15f_skipped_${intentId}`).set({
        eventId: `audit_stage15f_skipped_${intentId}`,
        action: "order.skipped",
        actorType: "super_admin",
        actorId: "stage15f-qa",
        workspaceId: ids.workspaceId,
        studentId: intent.studentId,
        targetType: "intent",
        targetId: intentId,
        safeMessage: "Stage 15F QA skipped a non-paper ready_for_paper intent.",
        severity: "warning",
        after: {
          intentId,
          status: intent.status,
          paperTradingOnly: intent.paperTradingOnly,
          sanitizedFailureCode: "paper_worker_rejected_non_paper_intent"
        },
        createdAt: new Date().toISOString()
      });
      skippedCount += 1;
      continue;
    }

    const connection = await getRequired(
      `workspaces/${ids.workspaceId}/students/${intent.studentId}/exchange_connections/${intent.connectionId}`
    );

    assert(
      connection.status === "verified" &&
        connection.permissionVerification === "passed" &&
        connection.withdrawalPermission === "confirmed_disabled",
      `${intentId} connection is verified before paper attempt`
    );

    const attemptId = `attempt_${intentId}_1`;
    await db.doc(`workspaces/${ids.workspaceId}/order_attempts/${attemptId}`).set({
      orderAttemptId: attemptId,
      workspaceId: ids.workspaceId,
      intentId,
      signalId: intent.signalId,
      studentId: intent.studentId,
      connectionId: intent.connectionId,
      exchange: intent.exchange,
      executionMode: "paper",
      symbol: intent.symbol,
      side: intent.side,
      orderType: intent.orderType,
      status: "filled",
      idempotencyKey: `${intent.idempotencyKey}:attempt:1`,
      attemptNumber: 1,
      requestedPrice: intent.limitPrice ?? intent.sourceSignalVersion ?? "stage15f-paper",
      requestedAt: new Date().toISOString(),
      acknowledgedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await intentRef.set(
      {
        status: "completed_paper",
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    completedPaperCount += 1;
  }

  return { completedPaperCount, skippedCount };
}

configureEmulator();

const app = getApps()[0] ?? initializeApp({ projectId: STAGE15F_PROJECT_ID });
const db = getFirestore(app);

console.log("Running Stage 15F paper beta QA against Firestore emulator.");
console.log(`Project: ${STAGE15F_PROJECT_ID}`);
console.log(`Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);

const workspace = await getRequired(`workspaces/${ids.workspaceId}`);
assert(workspace.workspaceId === ids.workspaceId, "seeded workspace exists");
assert(tierIncludesAutoCopy(workspace, "pro_auto_copy"), "Pro Auto-Copy tier includes autoCopy");

const activeStudent = await getRequired(`workspaces/${ids.workspaceId}/students/${ids.students.paystackActive}`);
const activeSubscription = await getRequired(`workspaces/${ids.workspaceId}/students/${ids.students.paystackActive}/subscriptions/current`);
assert(activeStudent.paymentRail === "paystack", "active student uses Paystack default rail");
assert(activeSubscription.status === "active", "active Paystack student subscription is active");
assert(activeStudent.brokerLink?.type === "crypto", "active Paystack student is personal crypto posture");

const fundedStudent = await getRequired(`workspaces/${ids.workspaceId}/students/${ids.students.fundedBlocked}`);
assert(fundedStudent.brokerLink?.type === "prop_firm", "funded student fixture is prop-firm posture");
await assertRiskDecision("risk_stage15f_funded_blocked", {
  status: "blocked",
  failedCheckKey: "risk_posture"
});
await assertNoIntentForStudent(ids.students.fundedBlocked);

await assertRiskDecision("risk_stage15f_paused_blocked", {
  status: "blocked",
  failedCheckKey: "student_pause"
});
await assertNoIntentForStudent(ids.students.paused);

await assertRiskDecision("risk_stage15f_unconnected_blocked", {
  status: "blocked",
  failedCheckKey: "exchange_connection"
});
await assertNoIntentForStudent(ids.students.unconnected);

const sandboxPreferredIntent = await getRequired(
  `workspaces/${ids.workspaceId}/execution_intents/${ids.intents.sandboxPreferredBuy}`
);
assert(
  sandboxPreferredIntent.connectionId === ids.connections.preferredSandbox,
  "sandbox-only routing prefers older sandbox connection over newer production connection"
);

const buyIntent = await getRequired(`workspaces/${ids.workspaceId}/execution_intents/${ids.intents.binanceBuy}`);
assert(
  buyIntent.status === "ready_for_paper" && buyIntent.paperTradingOnly === true && buyIntent.side === "buy",
  "valid buy signal produced paper-only ready intent"
);

const sellIntent = await getRequired(`workspaces/${ids.workspaceId}/execution_intents/${ids.intents.bybitSell}`);
assert(
  sellIntent.status === "ready_for_paper" && sellIntent.paperTradingOnly === true && sellIntent.side === "sell",
  "valid sell signal produced paper-only ready intent"
);

await assertRiskDecision("risk_stage15f_invalid_levels", {
  status: "blocked",
  failedCheckKey: "signal_directional_levels"
});
await assertRiskDecision("risk_stage15f_workspace_kill_switch", {
  status: "blocked",
  failedCheckKey: "workspace_kill_switch"
});
await assertRiskDecision("risk_stage15f_platform_kill_switch", {
  status: "blocked",
  failedCheckKey: "platform_kill_switch"
});

await resetWorkerFixtures();
const workerResult = await runPaperWorkerFixture();
assert(workerResult.completedPaperCount === 1, "paper worker fixture completed one paper attempt");
assert(workerResult.skippedCount === 1, "paper worker fixture skipped non-paper ready_for_paper intent");

const workerAttempt = await getRequired(`workspaces/${ids.workspaceId}/order_attempts/attempt_${ids.intents.workerCandidate}_1`);
assert(workerAttempt.executionMode === "paper", "worker attempt executionMode is paper");
assert(workerAttempt.status === "filled", "worker attempt is filled paper simulation");

const completedIntent = await getRequired(`workspaces/${ids.workspaceId}/execution_intents/${ids.intents.workerCandidate}`);
assert(completedIntent.status === "completed_paper", "worker candidate marked completed_paper");

const nonPaperAttemptSnapshot = await db
  .doc(`workspaces/${ids.workspaceId}/order_attempts/attempt_${ids.intents.nonPaperReady}_1`)
  .get();
assert(!nonPaperAttemptSnapshot.exists, "non-paper ready_for_paper intent did not create an order attempt");

const allIntents = await listCollection(`workspaces/${ids.workspaceId}/execution_intents`);
const forbiddenLiveIntentStatus = ["ready_for", "live"].join("_");
assert(!allIntents.some((intent) => intent.status === forbiddenLiveIntentStatus), "no live-ready intents exist");
assert(allIntents.every((intent) => intent.status !== "completed_paper" || intent.paperTradingOnly === true), "completed paper intents remain paperTradingOnly");

const allAttempts = await listCollection(`workspaces/${ids.workspaceId}/order_attempts`);
assert(allAttempts.every((attempt) => attempt.executionMode === "paper"), "all seeded/QA order attempts are paper mode");

console.log("Stage 15F paper beta QA passed.");
