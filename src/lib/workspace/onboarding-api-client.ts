"use client";

import { getFirebaseAuthClient } from "@/lib/firebase/client";
import type { ApiErrorResponse } from "@/types/admin-api";

async function getCurrentIdToken() {
  const auth = getFirebaseAuthClient();
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("Sign in before loading workspace onboarding.");
  }

  return user.getIdToken();
}

export async function requestWorkspaceOnboardingApi<T>(
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

    throw new Error(
      errorPayload?.error.message ?? "TradeHub could not complete that workspace request."
    );
  }

  return payload as T;
}
