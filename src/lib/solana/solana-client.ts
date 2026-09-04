import crypto from "node:crypto";
import { AdminApiError } from "@/lib/firebase/admin-errors";
import type { SolanaNetwork, SolanaPaymentIntent, SolanaReadiness } from "@/types/payments";
import type { Workspace } from "@/types/workspace";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58_INDEX = new Map(BASE58_ALPHABET.split("").map((char, index) => [char, index]));

type RpcResponse<T> = {
  result?: T;
  error?: {
    code: number;
    message: string;
  };
};

type SignatureInfo = {
  signature: string;
  err: unknown;
};

type ParsedTokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
  };
};

type ParsedTransaction = {
  meta?: {
    err: unknown;
    preTokenBalances?: ParsedTokenBalance[];
    postTokenBalances?: ParsedTokenBalance[];
  };
  transaction?: {
    message?: {
      accountKeys?: Array<string | { pubkey?: string }>;
    };
  };
};

type TokenAccountsByOwnerResult = {
  value?: Array<{
    account?: {
      data?: {
        parsed?: {
          info?: {
            tokenAmount?: {
              amount?: string;
              decimals?: number;
            };
          };
        };
      };
    };
  }>;
};

export class SolanaConfigurationError extends AdminApiError {
  constructor(message = "Solana Pay is not configured for this environment.") {
    super(503, "solana_not_configured", message);
    this.name = "SolanaConfigurationError";
  }
}

function readEnv(key: string) {
  return process.env[key]?.trim() ?? "";
}

function normalizeNetwork(value: string): SolanaNetwork {
  if (value === "devnet" || value === "testnet" || value === "mainnet-beta") {
    return value;
  }

  return value ? "custom" : "devnet";
}

export function encodeBase58(bytes: Uint8Array) {
  if (bytes.length === 0) {
    return "";
  }

  const digits = [0];

  for (const byte of bytes) {
    let carry = byte;

    for (let index = 0; index < digits.length; index += 1) {
      const value = digits[index] * 256 + carry;
      digits[index] = value % 58;
      carry = Math.floor(value / 58);
    }

    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let output = "";

  for (const byte of bytes) {
    if (byte === 0) {
      output += BASE58_ALPHABET[0];
    } else {
      break;
    }
  }

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    output += BASE58_ALPHABET[digits[index]];
  }

  return output;
}

export function decodeBase58(value: string) {
  if (!value) {
    return new Uint8Array();
  }

  const bytes = [0];

  for (const char of value) {
    const digit = BASE58_INDEX.get(char);

    if (digit === undefined) {
      throw new Error("invalid_base58");
    }

    let carry = digit;

    for (let index = 0; index < bytes.length; index += 1) {
      const next = bytes[index] * 58 + carry;
      bytes[index] = next & 0xff;
      carry = next >> 8;
    }

    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (const char of value) {
    if (char === BASE58_ALPHABET[0]) {
      bytes.push(0);
    } else {
      break;
    }
  }

  return new Uint8Array(bytes.reverse());
}

export function isSolanaPublicKey(value?: string) {
  if (!value) {
    return false;
  }

  try {
    return decodeBase58(value).length === 32;
  } catch {
    return false;
  }
}

export function createSolanaReference() {
  return encodeBase58(crypto.randomBytes(32));
}

export function getSolanaNetwork(): SolanaNetwork {
  return normalizeNetwork(readEnv("NEXT_PUBLIC_SOLANA_NETWORK"));
}

export function getSolanaQuoteTtlSeconds() {
  const raw = Number(readEnv("SOLANA_PAYMENT_QUOTE_TTL_SECONDS"));
  return Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 3600) : 900;
}

export function getSolanaFxRate() {
  const raw = Number(readEnv("SOLANA_USDC_NGN_FX_RATE"));
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

export function getSolanaConfig() {
  const rpcUrl = readEnv("SOLANA_RPC_URL");
  const usdcMint = readEnv("SOLANA_USDC_MINT");
  const platformWallet = readEnv("PLATFORM_SOLANA_USDC_WALLET");
  const fxRate = getSolanaFxRate();
  const missing: string[] = [];

  if (!rpcUrl) missing.push("SOLANA_RPC_URL");
  if (!isSolanaPublicKey(usdcMint)) missing.push("SOLANA_USDC_MINT");
  if (!isSolanaPublicKey(platformWallet)) missing.push("PLATFORM_SOLANA_USDC_WALLET");
  if (!fxRate) missing.push("SOLANA_USDC_NGN_FX_RATE");

  return {
    configured: missing.length === 0,
    missing,
    network: getSolanaNetwork(),
    rpcUrl,
    usdcMint,
    platformWallet,
    fxRate,
    quoteTtlSeconds: getSolanaQuoteTtlSeconds()
  };
}

export function requireSolanaConfig() {
  const config = getSolanaConfig();

  if (!config.configured || !config.fxRate) {
    throw new SolanaConfigurationError(
      `Solana Pay is missing required server configuration: ${config.missing.join(", ")}.`
    );
  }

  return {
    ...config,
    fxRate: config.fxRate
  };
}

export function getSolanaReadiness(workspace?: Workspace): SolanaReadiness {
  const config = getSolanaConfig();
  const solanaRail = workspace?.rails.find((rail) => rail.rail === "solana");
  const workspaceWalletConfigured = isSolanaPublicKey(workspace?.solanaPayoutWallet);
  const workspaceApproved =
    Boolean(workspace) &&
    workspace?.vettingStatus === "approved" &&
    workspace?.solanaPayEnabled === true &&
    solanaRail?.status === "enabled" &&
    workspaceWalletConfigured;
  const missing = [...config.missing];

  if (workspace && solanaRail?.status !== "enabled") missing.push("workspace Solana rail approval");
  if (workspace && !workspace.solanaPayEnabled) missing.push("workspace Solana enablement");
  if (workspace && !workspaceWalletConfigured) missing.push("workspace public payout wallet");

  const eligible = config.configured && workspaceApproved;

  return {
    configured: config.configured,
    eligible,
    network: config.network,
    platformWalletConfigured: isSolanaPublicKey(config.platformWallet),
    usdcMintConfigured: isSolanaPublicKey(config.usdcMint),
    rpcConfigured: Boolean(config.rpcUrl),
    fxRateConfigured: Boolean(config.fxRate),
    workspaceWalletConfigured,
    missing,
    message: eligible
      ? "Solana Pay / USDC checkout is available for this approved workspace."
      : "Solana Pay is optional and is not available until workspace and server readiness are complete."
  };
}

export function buildSolanaPayUrl({
  recipient,
  amountUsdc,
  usdcMint,
  reference,
  label,
  message,
  memo
}: {
  recipient: string;
  amountUsdc: number;
  usdcMint: string;
  reference: string;
  label: string;
  message: string;
  memo: string;
}) {
  const params = new URLSearchParams({
    amount: amountUsdc.toFixed(6).replace(/\.?0+$/, ""),
    "spl-token": usdcMint,
    reference,
    label,
    message,
    memo
  });

  return `solana:${recipient}?${params.toString()}`;
}

export function quoteUsdcFromNgn(amountNgn: number, fxRate: number) {
  return Number((amountNgn / fxRate).toFixed(6));
}

async function solanaRpc<T>(method: string, params: unknown[]): Promise<T> {
  const { rpcUrl } = requireSolanaConfig();
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `tradehub_${Date.now()}`,
      method,
      params
    })
  });
  const payload = await response.json().catch(() => null) as RpcResponse<T> | null;

  if (!response.ok || payload?.error) {
    throw new AdminApiError(
      502,
      "solana_rpc_error",
      payload?.error?.message || "Solana RPC could not complete that request."
    );
  }

  return payload?.result as T;
}

function accountKeyToString(value: string | { pubkey?: string }) {
  return typeof value === "string" ? value : value.pubkey ?? "";
}

function rawAmountForUiAmount(amountUsdc: number, decimals: number) {
  return BigInt(Math.ceil((amountUsdc + Number.EPSILON) * 10 ** decimals));
}

function tokenBalanceAmount(value?: ParsedTokenBalance) {
  return value?.uiTokenAmount.amount ? BigInt(value.uiTokenAmount.amount) : BigInt(0);
}

function isLocalRpcUrl(rpcUrl: string) {
  try {
    const url = new URL(rpcUrl);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1");
  }
}

async function getOwnerUsdcBalance(ownerWallet: string, usdcMint: string) {
  const result = await solanaRpc<TokenAccountsByOwnerResult>("getTokenAccountsByOwner", [
    ownerWallet,
    { mint: usdcMint },
    { encoding: "jsonParsed" }
  ]);
  let amount = BigInt(0);
  let decimals = 6;

  for (const entry of result.value ?? []) {
    const tokenAmount = entry.account?.data?.parsed?.info?.tokenAmount;

    if (!tokenAmount?.amount) {
      continue;
    }

    amount += BigInt(tokenAmount.amount);

    if (typeof tokenAmount.decimals === "number") {
      decimals = tokenAmount.decimals;
    }
  }

  return { amount, decimals };
}

export async function getOwnerUsdcBalanceSnapshot(ownerWallet: string, usdcMint: string) {
  const balance = await getOwnerUsdcBalance(ownerWallet, usdcMint);
  return balance.amount.toString();
}

function validateTokenBalanceDelta(transaction: ParsedTransaction, intent: SolanaPaymentIntent) {
  const postBalances = transaction.meta?.postTokenBalances ?? [];
  const preBalances = transaction.meta?.preTokenBalances ?? [];

  for (const post of postBalances) {
    if (post.mint !== intent.usdcMint || post.owner !== intent.platformWallet) {
      continue;
    }

    const pre = preBalances.find((entry) => entry.accountIndex === post.accountIndex);
    const delta = tokenBalanceAmount(post) - tokenBalanceAmount(pre);
    const expected = rawAmountForUiAmount(intent.amountUsdc, post.uiTokenAmount.decimals);

    if (delta >= expected) {
      return true;
    }
  }

  return false;
}

export async function findSolanaSignature(reference: string) {
  const signatures = await solanaRpc<SignatureInfo[]>("getSignaturesForAddress", [
    reference,
    { limit: 10 }
  ]);

  return signatures.find((entry) => !entry.err)?.signature ?? null;
}

export async function verifySolanaPaymentIntent(intent: SolanaPaymentIntent, signature?: string) {
  const config = requireSolanaConfig();
  const resolvedSignature = signature || await findSolanaSignature(intent.reference);

  if (!resolvedSignature) {
    return {
      status: "pending" as const,
      message: "No confirmed Solana transaction was found for this reference yet."
    };
  }

  const transaction = await solanaRpc<ParsedTransaction | null>("getTransaction", [
    resolvedSignature,
    {
      encoding: "jsonParsed",
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0
    }
  ]);

  if (!transaction) {
    if (isLocalRpcUrl(config.rpcUrl) && signature && intent.platformTokenBalanceBeforeRaw) {
      const currentBalance = await getOwnerUsdcBalance(intent.platformWallet, intent.usdcMint);
      const beforeRaw = BigInt(intent.platformTokenBalanceBeforeRaw);
      const expectedRaw = rawAmountForUiAmount(intent.amountUsdc, currentBalance.decimals);

      if (currentBalance.amount - beforeRaw >= expectedRaw) {
        return {
          status: "verified" as const,
          signature: resolvedSignature,
          message:
            "Localhost Solana USDC payment verified by balance delta because RPC transaction history is unavailable."
        };
      }
    }

    return {
      status: "pending" as const,
      message: "The transaction signature exists, but parsed transaction details are not available yet."
    };
  }

  if (transaction.meta?.err) {
    throw new AdminApiError(400, "solana_transaction_failed", "The referenced Solana transaction failed on-chain.");
  }

  const accountKeys = transaction.transaction?.message?.accountKeys?.map(accountKeyToString) ?? [];

  if (!accountKeys.includes(intent.reference)) {
    throw new AdminApiError(400, "solana_reference_mismatch", "The Solana transaction does not include the expected reference.");
  }

  if (!validateTokenBalanceDelta(transaction, intent)) {
    throw new AdminApiError(
      400,
      "solana_transfer_mismatch",
      "The Solana transaction did not transfer enough configured USDC to the platform wallet."
    );
  }

  return {
    status: "verified" as const,
    signature: resolvedSignature,
    message: "Solana USDC payment verified on-chain."
  };
}
