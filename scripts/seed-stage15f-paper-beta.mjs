import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  STAGE15F_PROJECT_ID,
  STAGE15F_FIXED_NOW,
  auditEventDoc,
  connectionDoc,
  ids,
  intentDoc,
  isoMinutes,
  orderAttemptDoc,
  preferencesDoc,
  riskDecisionDoc,
  signalDoc,
  studentDoc,
  subscriptionDoc,
  workspaceDoc
} from "./stage15f-paper-beta-fixtures.mjs";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function configureEmulatorSafety() {
  if (process.env.TRADEHUB_ALLOW_LIVE_STAGE15F_SEED === "true") {
    fail("Stage 15F seed refuses live Firestore writes. Remove TRADEHUB_ALLOW_LIVE_STAGE15F_SEED and use the Firestore emulator.");
  }

  process.env.GCLOUD_PROJECT ||= STAGE15F_PROJECT_ID;
  process.env.FIREBASE_CONFIG ||= JSON.stringify({ projectId: STAGE15F_PROJECT_ID });
  process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
}

function batchSet(batch, path, data) {
  batch.set(db.doc(path), data, { merge: true });
}

configureEmulatorSafety();

const app = getApps()[0] ?? initializeApp({ projectId: STAGE15F_PROJECT_ID });
const db = getFirestore(app);
const batch = db.batch();
const { workspaceId } = ids;

batchSet(batch, `workspaces/${workspaceId}`, workspaceDoc());
batchSet(batch, `workspaces/${workspaceId}/dashboard/current`, {
  workspaceId,
  ownerApprovalStatus: "approved",
  activeStudentCount: Object.keys(ids.students).length,
  trialingStudentCount: 0,
  pastDueStudentCount: 0,
  monthlyGrossRevenueNgn: 315000,
  monthlyInfluencerRevenueNgn: 283500,
  monthlyPlatformRevenueNgn: 31500,
  healthStatus: "healthy",
  updatedAt: STAGE15F_FIXED_NOW
});
batchSet(batch, "platform_execution_controls/current", {
  killSwitchEnabled: false,
  sandboxOnly: true,
  updatedAt: STAGE15F_FIXED_NOW
});
batchSet(batch, `workspaces/${workspaceId}/execution_controls/current`, {
  workspaceId,
  killSwitchEnabled: false,
  sandboxOnly: true,
  updatedAt: STAGE15F_FIXED_NOW
});

const students = [
  [ids.students.paystackActive, studentDoc(ids.students.paystackActive)],
  [ids.students.binanceSandbox, studentDoc(ids.students.binanceSandbox)],
  [ids.students.bybitSandbox, studentDoc(ids.students.bybitSandbox, {
    brokerLink: { type: "crypto", exchange: "bybit", status: "linked" }
  })],
  [ids.students.sandboxPreferred, studentDoc(ids.students.sandboxPreferred)],
  [ids.students.fundedBlocked, studentDoc(ids.students.fundedBlocked, {
    accountMode: "signal_alerts",
    brokerLink: { type: "prop_firm", exchange: "mt5", status: "unlinked" },
    autoCopyEligible: false,
    propFirmDisclosureAcceptedAt: isoMinutes(-310)
  })],
  [ids.students.paused, studentDoc(ids.students.paused)],
  [ids.students.unconnected, studentDoc(ids.students.unconnected, {
    brokerLink: { type: "crypto", exchange: "binance", status: "unlinked" }
  })]
];

for (const [studentId, doc] of students) {
  batchSet(batch, `workspaces/${workspaceId}/students/${studentId}`, doc);
  batchSet(batch, `workspaces/${workspaceId}/students/${studentId}/subscriptions/current`, subscriptionDoc(studentId));
  batchSet(batch, `workspaces/${workspaceId}/students/${studentId}/execution_preferences/current`, preferencesDoc(studentId, studentId === ids.students.paused
    ? { optInState: "paused", studentPaused: true, studentPausedAt: isoMinutes(-30) }
    : {}));
}

batchSet(batch, `workspaces/${workspaceId}/students/${ids.students.binanceSandbox}/exchange_connections/${ids.connections.binanceSandbox}`, connectionDoc({
  connectionId: ids.connections.binanceSandbox,
  studentId: ids.students.binanceSandbox,
  exchange: "binance",
  environment: "sandbox",
  keyFingerprint: "stage15f_binance_sandbox_fp"
}));
batchSet(batch, `workspaces/${workspaceId}/students/${ids.students.bybitSandbox}/exchange_connections/${ids.connections.bybitSandbox}`, connectionDoc({
  connectionId: ids.connections.bybitSandbox,
  studentId: ids.students.bybitSandbox,
  exchange: "bybit",
  environment: "sandbox",
  keyFingerprint: "stage15f_bybit_sandbox_fp"
}));
batchSet(batch, `workspaces/${workspaceId}/students/${ids.students.sandboxPreferred}/exchange_connections/${ids.connections.preferredSandbox}`, connectionDoc({
  connectionId: ids.connections.preferredSandbox,
  studentId: ids.students.sandboxPreferred,
  exchange: "binance",
  environment: "sandbox",
  keyFingerprint: "stage15f_preferred_sandbox_fp",
  updatedAt: isoMinutes(-90)
}));
batchSet(batch, `workspaces/${workspaceId}/students/${ids.students.sandboxPreferred}/exchange_connections/${ids.connections.preferredProduction}`, connectionDoc({
  connectionId: ids.connections.preferredProduction,
  studentId: ids.students.sandboxPreferred,
  exchange: "binance",
  environment: "production",
  keyFingerprint: "stage15f_preferred_production_fp",
  updatedAt: isoMinutes(-10)
}));
batchSet(batch, `workspaces/${workspaceId}/students/${ids.students.paused}/exchange_connections/${ids.connections.pausedBinance}`, connectionDoc({
  connectionId: ids.connections.pausedBinance,
  studentId: ids.students.paused,
  exchange: "binance",
  environment: "sandbox",
  keyFingerprint: "stage15f_paused_sandbox_fp"
}));

batchSet(batch, `workspaces/${workspaceId}/signals/${ids.signals.buyValid}`, signalDoc(ids.signals.buyValid));
batchSet(batch, `workspaces/${workspaceId}/signals/${ids.signals.sellValid}`, signalDoc(ids.signals.sellValid, {
  pair: "ETHUSDT",
  direction: "sell",
  entry: "100",
  takeProfit: "90",
  stopLoss: "105"
}));
batchSet(batch, `workspaces/${workspaceId}/signals/${ids.signals.invalidBuyLevels}`, signalDoc(ids.signals.invalidBuyLevels, {
  pair: "SOLUSDT",
  direction: "buy",
  entry: "100",
  takeProfit: "90",
  stopLoss: "95"
}));
batchSet(batch, `workspaces/${workspaceId}/signals/${ids.signals.workspaceKillSwitch}`, signalDoc(ids.signals.workspaceKillSwitch, {
  pair: "BNBUSDT",
  notes: "Workspace kill-switch blocked check."
}));
batchSet(batch, `workspaces/${workspaceId}/signals/${ids.signals.platformKillSwitch}`, signalDoc(ids.signals.platformKillSwitch, {
  pair: "ADAUSDT",
  notes: "Platform kill-switch blocked check."
}));

const allowedRecords = [
  {
    intentId: ids.intents.binanceBuy,
    signalId: ids.signals.buyValid,
    studentId: ids.students.binanceSandbox,
    connectionId: ids.connections.binanceSandbox,
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy"
  },
  {
    intentId: ids.intents.bybitSell,
    signalId: ids.signals.sellValid,
    studentId: ids.students.bybitSandbox,
    connectionId: ids.connections.bybitSandbox,
    exchange: "bybit",
    symbol: "ETHUSDT",
    side: "sell"
  },
  {
    intentId: ids.intents.sandboxPreferredBuy,
    signalId: ids.signals.buyValid,
    studentId: ids.students.sandboxPreferred,
    connectionId: ids.connections.preferredSandbox,
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy"
  },
  {
    intentId: ids.intents.workerCandidate,
    signalId: ids.signals.buyValid,
    studentId: ids.students.binanceSandbox,
    connectionId: ids.connections.binanceSandbox,
    exchange: "binance",
    symbol: "BTCUSDT",
    side: "buy",
    updatedAt: isoMinutes(-8)
  },
  {
    intentId: ids.intents.completedPreview,
    signalId: ids.signals.sellValid,
    studentId: ids.students.bybitSandbox,
    connectionId: ids.connections.bybitSandbox,
    exchange: "bybit",
    symbol: "ETHUSDT",
    side: "sell",
    status: "completed_paper",
    updatedAt: isoMinutes(-20)
  }
];

for (const record of allowedRecords) {
  const decisionId = `risk_${record.intentId}`;
  batchSet(batch, `workspaces/${workspaceId}/risk_decisions/${decisionId}`, riskDecisionDoc({
    decisionId,
    intentId: record.intentId,
    signalId: record.signalId,
    studentId: record.studentId,
    connectionId: record.connectionId,
    status: "allowed"
  }));
  batchSet(batch, `workspaces/${workspaceId}/execution_intents/${record.intentId}`, intentDoc({
    riskDecisionId: decisionId,
    ...record
  }));
}

const blockedDecisions = [
  {
    decisionId: "risk_stage15f_funded_blocked",
    intentId: "blocked_stage15f_funded",
    signalId: ids.signals.buyValid,
    studentId: ids.students.fundedBlocked,
    status: "blocked",
    blockedReason: "Funded-account students remain Signal Alerts only.",
    failedCheckKey: "risk_posture"
  },
  {
    decisionId: "risk_stage15f_paused_blocked",
    intentId: "blocked_stage15f_paused",
    signalId: ids.signals.buyValid,
    studentId: ids.students.paused,
    connectionId: ids.connections.pausedBinance,
    status: "blocked",
    blockedReason: "Student paused crypto Auto-Copy.",
    failedCheckKey: "student_pause"
  },
  {
    decisionId: "risk_stage15f_unconnected_blocked",
    intentId: "blocked_stage15f_unconnected",
    signalId: ids.signals.buyValid,
    studentId: ids.students.unconnected,
    status: "blocked",
    blockedReason: "No verified Binance or Bybit connection metadata exists.",
    failedCheckKey: "exchange_connection"
  },
  {
    decisionId: "risk_stage15f_invalid_levels",
    intentId: "blocked_stage15f_invalid_levels",
    signalId: ids.signals.invalidBuyLevels,
    studentId: ids.students.binanceSandbox,
    connectionId: ids.connections.binanceSandbox,
    status: "blocked",
    blockedReason: "Buy signals require take-profit above entry and stop-loss below entry.",
    failedCheckKey: "signal_directional_levels"
  },
  {
    decisionId: "risk_stage15f_workspace_kill_switch",
    intentId: "blocked_stage15f_workspace_kill_switch",
    signalId: ids.signals.workspaceKillSwitch,
    studentId: ids.students.binanceSandbox,
    connectionId: ids.connections.binanceSandbox,
    status: "blocked",
    blockedReason: "Workspace crypto Auto-Copy kill switch is enabled.",
    failedCheckKey: "workspace_kill_switch"
  },
  {
    decisionId: "risk_stage15f_platform_kill_switch",
    intentId: "blocked_stage15f_platform_kill_switch",
    signalId: ids.signals.platformKillSwitch,
    studentId: ids.students.bybitSandbox,
    connectionId: ids.connections.bybitSandbox,
    status: "blocked",
    blockedReason: "Platform crypto Auto-Copy kill switch is enabled.",
    failedCheckKey: "platform_kill_switch"
  }
];

for (const decision of blockedDecisions) {
  batchSet(batch, `workspaces/${workspaceId}/risk_decisions/${decision.decisionId}`, riskDecisionDoc(decision));
}

batchSet(batch, `workspaces/${workspaceId}/execution_intents/${ids.intents.nonPaperReady}`, intentDoc({
  intentId: ids.intents.nonPaperReady,
  signalId: ids.signals.buyValid,
  studentId: ids.students.binanceSandbox,
  connectionId: ids.connections.binanceSandbox,
  exchange: "binance",
  symbol: "BTCUSDT",
  side: "buy",
  riskDecisionId: "risk_stage15f_non_paper_ready",
  paperTradingOnly: false,
  updatedAt: isoMinutes(-5)
}));
batchSet(batch, `workspaces/${workspaceId}/risk_decisions/risk_stage15f_non_paper_ready`, riskDecisionDoc({
  decisionId: "risk_stage15f_non_paper_ready",
  intentId: ids.intents.nonPaperReady,
  signalId: ids.signals.buyValid,
  studentId: ids.students.binanceSandbox,
  connectionId: ids.connections.binanceSandbox,
  status: "allowed"
}));

batchSet(batch, `workspaces/${workspaceId}/order_attempts/attempt_${ids.intents.completedPreview}_1`, orderAttemptDoc({
  orderAttemptId: `attempt_${ids.intents.completedPreview}_1`,
  intentId: ids.intents.completedPreview,
  signalId: ids.signals.sellValid,
  studentId: ids.students.bybitSandbox,
  connectionId: ids.connections.bybitSandbox,
  exchange: "bybit",
  symbol: "ETHUSDT",
  side: "sell"
}));

batchSet(batch, `workspaces/${workspaceId}/execution_audit_events/audit_stage15f_seed`, auditEventDoc("audit_stage15f_seed"));
batchSet(batch, `workspaces/${workspaceId}/execution_audit_events/audit_stage15f_routing_bounded`, auditEventDoc("audit_stage15f_routing_bounded", {
  action: "routing.bounded",
  targetId: ids.signals.buyValid,
  safeMessage: "Bounded routing check.",
  createdAt: isoMinutes(-50)
}));

await batch.commit();

const generatedPaperIntentSnapshot = await db.collection(`workspaces/${workspaceId}/execution_intents`).get();
const generatedRiskDecisionSnapshot = await db.collection(`workspaces/${workspaceId}/risk_decisions`).get();
const generatedPaperAttemptSnapshot = await db.collection(`workspaces/${workspaceId}/order_attempts`).get();
const generatedDeletes = [
  ...generatedPaperIntentSnapshot.docs
    .filter((doc) => doc.id.startsWith("intent_ws_stage15f_paper_beta_sig_"))
    .map((doc) => doc.ref.delete()),
  ...generatedRiskDecisionSnapshot.docs
    .filter((doc) => doc.id.startsWith("risk_intent_ws_stage15f_paper_beta_sig_"))
    .map((doc) => doc.ref.delete()),
  ...generatedPaperAttemptSnapshot.docs
    .filter((doc) => doc.id.startsWith("attempt_intent_ws_stage15f_paper_beta_sig_"))
    .map((doc) => doc.ref.delete())
];

await Promise.all([
  ...generatedDeletes,
  db.doc(`workspaces/${workspaceId}/order_attempts/attempt_${ids.intents.workerCandidate}_1`).delete(),
  db.doc(`workspaces/${workspaceId}/order_attempts/attempt_${ids.intents.nonPaperReady}_1`).delete()
]);

console.log("Stage 15F paper beta seed complete.");
console.log(`Project: ${STAGE15F_PROJECT_ID}`);
console.log(`Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
console.log(`Workspace: ${workspaceId}`);
console.log(`Influencer: ${ids.influencerId}`);
console.log(`Students: ${Object.values(ids.students).join(", ")}`);
console.log(`Signals: ${Object.values(ids.signals).join(", ")}`);
console.log("Manual QA URLs:");
console.log("  Student copier: http://localhost:3000/app/copier");
console.log("  Influencer workspace: http://localhost:3000/workspace");
console.log("  Super Admin: http://localhost:3000/admin");
console.log("No exchange API keys, secrets, encrypted blobs, or broker credential refs were seeded.");
