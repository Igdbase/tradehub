"use client";

import { requestCourseHubApi } from "@/lib/course-hub/course-api-client";
import type {
  StudentBillingCheckoutResponse,
  StudentBillingOverviewResponse,
  StudentBillingVerifyResponse,
  StudentSolanaCheckoutResponse,
  StudentSolanaVerifyResponse
} from "@/types/payments";

export function getStudentBillingOverviewClient() {
  return requestCourseHubApi<StudentBillingOverviewResponse>("/api/student/billing/overview");
}

export function startStudentBillingCheckoutClient(tierId: string) {
  return requestCourseHubApi<StudentBillingCheckoutResponse>("/api/student/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ tierId })
  });
}

export function verifyStudentBillingReferenceClient(reference: string) {
  const params = new URLSearchParams({ reference });
  return requestCourseHubApi<StudentBillingVerifyResponse>(`/api/student/billing/verify?${params.toString()}`);
}

export function startStudentSolanaCheckoutClient(tierId: string) {
  return requestCourseHubApi<StudentSolanaCheckoutResponse>("/api/student/billing/solana/checkout", {
    method: "POST",
    body: JSON.stringify({ tierId })
  });
}

export function verifyStudentSolanaCheckoutClient(paymentIntentId: string, signature?: string) {
  const params = new URLSearchParams({ paymentIntentId });

  if (signature) {
    params.set("signature", signature);
  }

  return requestCourseHubApi<StudentSolanaVerifyResponse>(
    `/api/student/billing/solana/verify?${params.toString()}`
  );
}
