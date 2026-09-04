import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectId = "trade-hub-4d8df-stage15f-rules";
const rules = fs.readFileSync(path.join(rootDir, "firestore.rules"), "utf8");
const workspaceId = "ws_stage15f_rules";
const studentId = "student_stage15f_rules";
const protectedPaths = [
  `broker_keys/${workspaceId}/students/${studentId}/connections/conn_rules`,
  `broker_keys/${workspaceId}/students/${studentId}/forex_connections/forex_conn_rules`,
  "platform_execution_controls/current",
  "platform_live_execution_controls/current",
  "platform_forex_demo_controls/current",
  `workspaces/${workspaceId}/execution_controls/current`,
  `workspaces/${workspaceId}/live_execution_controls/current`,
  `workspaces/${workspaceId}/forex_demo_controls/current`,
  `workspaces/${workspaceId}/execution_intents/intent_rules`,
  `workspaces/${workspaceId}/forex_paper_intents/forex_intent_rules`,
  `workspaces/${workspaceId}/forex_demo_intents/forex_demo_intent_rules`,
  `workspaces/${workspaceId}/live_execution_intents/live_intent_rules`,
  `workspaces/${workspaceId}/order_attempts/attempt_rules`,
  `workspaces/${workspaceId}/forex_paper_attempts/forex_attempt_rules`,
  `workspaces/${workspaceId}/forex_demo_order_attempts/forex_demo_attempt_rules`,
  `workspaces/${workspaceId}/live_order_attempts/live_attempt_rules`,
  `workspaces/${workspaceId}/risk_decisions/risk_rules`,
  `workspaces/${workspaceId}/forex_risk_decisions/forex_risk_rules`,
  `workspaces/${workspaceId}/forex_demo_gate_decisions/forex_demo_gate_rules`,
  `workspaces/${workspaceId}/live_gate_decisions/live_gate_rules`,
  `workspaces/${workspaceId}/auto_copy_confirmations/confirm_rules`,
  `workspaces/${workspaceId}/stale_signal_decisions/stale_rules`,
  `workspaces/${workspaceId}/auto_copy_audit_events/audit_rules`,
  `workspaces/${workspaceId}/live_reconciliation_records/live_reconcile_rules`,
  `workspaces/${workspaceId}/forex_demo_reconciliation_records/forex_demo_reconcile_rules`,
  `workspaces/${workspaceId}/live_allowlists/students`,
  `workspaces/${workspaceId}/live_allowlists/production_students`,
  `workspaces/${workspaceId}/live_allowlists/production_exchanges`,
  `workspaces/${workspaceId}/live_allowlists/production_symbols`,
  `workspaces/${workspaceId}/live_incidents/incident_rules`,
  `workspaces/${workspaceId}/execution_audit_events/audit_rules`,
  `workspaces/${workspaceId}/forex_execution_audit_events/forex_audit_rules`,
  `workspaces/${workspaceId}/forex_demo_audit_events/forex_demo_audit_rules`,
  `workspaces/${workspaceId}/forex_connection_audit_events/forex_conn_audit_rules`,
  `workspaces/${workspaceId}/forex_provisioned_accounts/forex_provisioned_rules`,
  `workspaces/${workspaceId}/forex_autocopy_payment_intents/forex_autocopy_payment_rules`,
  `workspaces/${workspaceId}/crypto_autocopy_payment_intents/crypto_autocopy_payment_rules`,
  `workspaces/${workspaceId}/crypto_autocopy_audit_events/crypto_autocopy_audit_rules`,
  `workspaces/${workspaceId}/forex_provisioning_audit_events/forex_provisioning_audit_rules`,
  `workspaces/${workspaceId}/forex_provisioning_controls/current`,
  `workspaces/${workspaceId}/live_execution_audit_events/live_audit_rules`,
  `workspaces/${workspaceId}/students/${studentId}/exchange_connections/conn_rules`,
  `workspaces/${workspaceId}/students/${studentId}/forex_connections/forex_conn_rules`,
  `workspaces/${workspaceId}/students/${studentId}/forex_autocopy_subscriptions/current`,
  `workspaces/${workspaceId}/students/${studentId}/crypto_autocopy_subscriptions/current`,
  `workspaces/${workspaceId}/students/${studentId}/forex_provisioning/current`,
  `workspaces/${workspaceId}/students/${studentId}/forex_provisioning_requests/request_rules`,
  `workspaces/${workspaceId}/students/${studentId}/execution_preferences/current`,
  `workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/crypto`,
  `workspaces/${workspaceId}/students/${studentId}/auto_copy_preferences/forex`,
  `workspaces/${workspaceId}/students/${studentId}/live_consents/current`,
  `workspaces/${workspaceId}/students/${studentId}/live_execution_preferences/current`
];
const contexts = [
  {
    label: "unauthenticated client",
    db: (env) => env.unauthenticatedContext().firestore()
  },
  {
    label: "student client",
    db: (env) => env.authenticatedContext("student_uid_stage15f", {
      role: "student",
      workspaceId,
      studentId
    }).firestore()
  },
  {
    label: "influencer client",
    db: (env) => env.authenticatedContext("influencer_uid_stage15f", {
      role: "influencer",
      workspaceId
    }).firestore()
  },
  {
    label: "super admin client",
    db: (env) => env.authenticatedContext("super_admin_uid_stage15f", {
      role: "super_admin"
    }).firestore()
  }
];

function logPass(message) {
  console.log(`✓ ${message}`);
}

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules
  }
});

try {
  for (const context of contexts) {
    const db = context.db(testEnv);

    for (const protectedPath of protectedPaths) {
      const ref = doc(db, protectedPath);

      await assertFails(getDoc(ref));
      await assertFails(setDoc(ref, {
        stage: "15F-15I",
        shouldRemainDenied: true
      }));
    }

    logPass(`${context.label} cannot read/write protected crypto execution paths`);
  }

  console.log("Stage 15F/15H/15I Firestore rules denial tests passed.");
} finally {
  await testEnv.cleanup();
}
