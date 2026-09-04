"use client";

import { getFirebaseAuthClient } from "@/lib/firebase/client";
import type { ApiErrorResponse } from "@/types/admin-api";

function formatFieldLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export class WorkspaceApiError extends Error {
  readonly code?: string;
  readonly fields?: Record<string, string>;

  constructor(message: string, options?: { code?: string; fields?: Record<string, string> }) {
    super(message);
    this.name = "WorkspaceApiError";
    this.code = options?.code;
    this.fields = options?.fields;
  }
}

async function getCurrentIdToken() {
  const auth = getFirebaseAuthClient();
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("Sign in before loading workspace data.");
  }

  return user.getIdToken();
}

export async function requestWorkspaceDashboardApi<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getCurrentIdToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const errorPayload =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload as ApiErrorResponse)
        : null;

    if (errorPayload) {
      const fields = errorPayload.error.fields;
      const fieldSummary = fields
        ? Object.entries(fields)
            .map(([key, message]) => `${formatFieldLabel(key)}: ${message}`)
            .join(" ")
        : "";

      throw new WorkspaceApiError(
        fieldSummary
          ? `${errorPayload.error.message} ${fieldSummary}`
          : errorPayload.error.message,
        {
          code: errorPayload.error.code,
          fields
        }
      );
    }

    throw new WorkspaceApiError("TradeHub could not complete that workspace request.");
  }

  return payload as T;
}
