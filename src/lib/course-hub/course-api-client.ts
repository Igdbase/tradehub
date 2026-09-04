"use client";

import { WorkspaceApiError } from "@/lib/workspace/dashboard-api-client";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import type { ApiErrorResponse } from "@/types/admin-api";

function formatFieldLabel(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

async function getCurrentIdToken(forceRefresh = false) {
  const auth = getFirebaseAuthClient();
  const user = auth?.currentUser;

  if (!user) {
    throw new WorkspaceApiError("Sign in before loading course data.");
  }

  return user.getIdToken(forceRefresh);
}

async function performRequest(path: string, init: RequestInit | undefined, forceRefresh: boolean) {
  const token = await getCurrentIdToken(forceRefresh);
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });
  const payload = (await response.json()) as unknown;

  return { response, payload };
}

export async function requestCourseHubApi<T>(path: string, init?: RequestInit): Promise<T> {
  let { response, payload } = await performRequest(path, init, false);
  let errorPayload =
    typeof payload === "object" && payload !== null && "error" in payload
      ? (payload as ApiErrorResponse)
      : null;

  if (!response.ok) {
    if (errorPayload) {
      if (response.status === 401 && errorPayload.error.code === "invalid_auth_token") {
        const retry = await performRequest(path, init, true);
        response = retry.response;
        payload = retry.payload;
        errorPayload =
          typeof payload === "object" && payload !== null && "error" in payload
            ? (payload as ApiErrorResponse)
            : null;

        if (response.ok) {
          return payload as T;
        }
      }

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
    }

    throw new WorkspaceApiError("TradeHub could not complete that course request.");
  }

  return payload as T;
}
