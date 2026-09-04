import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";

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

function readFlag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1]?.trim() ?? "" : "";
}

function resolveHomePath(value) {
  if (!value) {
    return value;
  }

  return value.startsWith("~/") ? path.join(os.homedir(), value.slice(2)) : value;
}

function loadKeypair(keypairPath) {
  const resolvedPath = resolveHomePath(keypairPath);

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    fail(`Keypair file not found: ${resolvedPath || "(empty path)"}`);
  }

  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(resolvedPath, "utf8")));
  return Keypair.fromSecretKey(secretKey);
}

function recordFromSnapshot(snapshot, idField) {
  return {
    [idField]: snapshot.id,
    ...snapshot.data()
  };
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || left.updatedAt || 0);
    const rightTime = Date.parse(right.createdAt || right.updatedAt || 0);
    return rightTime - leftTime;
  });
}

async function findPaymentIntent(db, workspaceId, paymentIntentId, reference) {
  const collection = db.collection(`workspaces/${workspaceId}/payment_intents`);

  if (paymentIntentId) {
    const snapshot = await collection.doc(paymentIntentId).get();

    if (!snapshot.exists) {
      fail(`Payment intent ${paymentIntentId} was not found in workspace ${workspaceId}.`);
    }

    return recordFromSnapshot(snapshot, "paymentIntentId");
  }

  const snapshot = await collection.where("rail", "==", "solana").get();
  const intents = snapshot.docs.map((doc) => recordFromSnapshot(doc, "paymentIntentId"));
  const matching = intents.filter((intent) => {
    if (reference && intent.reference !== reference) {
      return false;
    }

    return intent.status === "pending";
  });

  if (matching.length === 0) {
    const qualifier = reference ? ` for reference ${reference}` : "";
    fail(`No pending Solana payment intent was found${qualifier} in workspace ${workspaceId}.`);
  }

  return sortByCreatedAtDesc(matching)[0];
}

function rawAmountFromUiAmount(amount, decimals) {
  const [wholePart, fractionalPart = ""] = String(amount).split(".");
  const safeFraction = `${fractionalPart}${"0".repeat(decimals)}`.slice(0, decimals);
  return BigInt(`${wholePart || "0"}${safeFraction}`.replace(/^0+(?=\d)/, ""));
}

async function main() {
  loadLocalEnvironment();

  const workspaceId = readFlag("--workspace") || process.env.INFLUENCER_WORKSPACE_ID?.trim() || "";
  const paymentIntentId = readFlag("--payment-intent");
  const reference = readFlag("--reference");
  const keypairPath =
    readFlag("--keypair") ||
    process.env.SOLANA_LOCAL_TEST_KEYPAIR?.trim() ||
    "~/.config/solana/devnet-test.json";
  const rpcUrl = process.env.SOLANA_RPC_URL?.trim() || "http://localhost:8899";

  if (!workspaceId) {
    fail("Missing workspace ID. Pass --workspace ws_example or set INFLUENCER_WORKSPACE_ID in .env.local.");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      ...getAdminCredentialConfig()
    });
  const db = getFirestore(app);
  const intent = await findPaymentIntent(db, workspaceId, paymentIntentId, reference);

  if (intent.rail !== "solana") {
    fail(`Payment intent ${intent.paymentIntentId} is not a Solana intent.`);
  }

  if (!intent.usdcMint || !intent.platformWallet || !intent.reference) {
    fail("This Solana payment intent is missing mint, platform wallet, or reference data.");
  }

  if (!intent.amountUsdc || Number(intent.amountUsdc) <= 0) {
    fail("This Solana payment intent does not have a valid USDC amount.");
  }

  if (intent.quoteExpiresAt && Date.now() > Date.parse(intent.quoteExpiresAt)) {
    fail(`Quote expired at ${intent.quoteExpiresAt}. Create a fresh quote in /app/billing first.`);
  }

  const payer = loadKeypair(keypairPath);
  const connection = new Connection(rpcUrl, "confirmed");
  const mint = new PublicKey(intent.usdcMint);
  const platformWallet = new PublicKey(intent.platformWallet);
  const referenceKey = new PublicKey(intent.reference);
  const mintInfo = await getMint(connection, mint);
  const senderAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
  const platformAta = await getOrCreateAssociatedTokenAccount(connection, payer, mint, platformWallet);
  const senderAccount = await getAccount(connection, senderAta.address);
  const rawAmount = rawAmountFromUiAmount(intent.amountUsdc, mintInfo.decimals);

  if (senderAccount.amount < rawAmount) {
    fail(
      `Sender token balance is too low. Need ${rawAmount.toString()} base units, but wallet has ${senderAccount.amount.toString()}.`
    );
  }

  const transferInstruction = createTransferCheckedInstruction(
    senderAta.address,
    mint,
    platformAta.address,
    payer.publicKey,
    rawAmount,
    mintInfo.decimals
  );
  // Solana Pay verification looks up the transaction by this readonly reference key.
  transferInstruction.keys.push({
    pubkey: referenceKey,
    isSigner: false,
    isWritable: false
  });

  const transaction = new Transaction().add(transferInstruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer], {
    commitment: "confirmed"
  });
  const platformAtaAddress = getAssociatedTokenAddressSync(mint, platformWallet);

  console.log("TradeHub local Solana test payment sent.");
  console.log(`Workspace: ${workspaceId}`);
  console.log(`Payment intent: ${intent.paymentIntentId}`);
  console.log(`Reference: ${intent.reference}`);
  console.log(`Amount USDC: ${intent.amountUsdc}`);
  console.log(`Sender wallet: ${payer.publicKey.toBase58()}`);
  console.log(`Sender token account: ${senderAta.address.toBase58()}`);
  console.log(`Platform wallet: ${platformWallet.toBase58()}`);
  console.log(`Platform token account: ${platformAtaAddress.toBase58()}`);
  console.log(`Signature: ${signature}`);
  console.log("");
  console.log("Go back to /app/billing and click Verify payment for this quote.");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Failed to send local Solana test payment.");
});
