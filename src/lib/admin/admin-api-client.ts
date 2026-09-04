"use client";

import { getFirebaseAuthClient } from "@/lib/firebase/client";
import type { ApiErrorResponse } from "@/types/admin-api";

async function getCurrentIdToken() {
  const auth = getFirebaseAuthClient();
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("Sign in before loading Super Admin data.");
  }

  return user.getIdToken();
}

async function createAuthorizedHeaders(initHeaders?: HeadersInit, contentType?: string) {
  const token = await getCurrentIdToken();
  const headers = new Headers(initHeaders);

  if (contentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", contentType);
  }

  headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function getApiErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
  return payload?.error.message ?? "TradeHub could not complete that admin request.";
}

export async function requestAdminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: await createAuthorizedHeaders(init?.headers, "application/json")
  });

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const errorPayload =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload as ApiErrorResponse)
        : null;
    const message = errorPayload?.error.message ?? "TradeHub could not complete that admin request.";

    throw new Error(message);
  }

  return payload as T;
}

export async function requestAdminFile(path: string, init?: RequestInit): Promise<Blob> {
  const response = await fetch(path, {
    ...init,
    headers: await createAuthorizedHeaders(init?.headers)
  });

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  return response.blob();
}
