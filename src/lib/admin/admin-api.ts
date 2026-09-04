import { NextResponse } from "next/server";
import { createSourceMeta } from "@/lib/admin/admin-mappers";
import { createFirestoreAdminRepository } from "@/lib/admin/firestore-admin-repository";
import { createMockAdminRepository } from "@/lib/admin/mock-admin-repository";
import type { AdminRepository } from "@/lib/admin/admin-repository";
import { requestHasBearerToken, requireSuperAdmin, type VerifiedSuperAdmin } from "@/lib/firebase/admin-auth";
import {
  AdminConfigurationError,
  getSafeErrorPayload,
  isAdminConfigurationError
} from "@/lib/firebase/admin-errors";

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function getDevelopmentActor(): VerifiedSuperAdmin {
  return {
    uid: "dev_mock_super_admin",
    email: "dev-admin@tradehub.local",
    token: {} as VerifiedSuperAdmin["token"]
  };
}

export async function getAdminRepositoryForRequest(request: Request): Promise<{
  repository: AdminRepository;
  actor: VerifiedSuperAdmin;
}> {
  try {
    const actor = await requireSuperAdmin(request);
    return {
      repository: createFirestoreAdminRepository(),
      actor
    };
  } catch (error) {
    if (isAdminConfigurationError(error) && isDevelopment() && requestHasBearerToken(request)) {
      return {
        repository: createMockAdminRepository(),
        actor: getDevelopmentActor()
      };
    }

    throw error;
  }
}

export function getPublicWriteRepository() {
  try {
    return createFirestoreAdminRepository();
  } catch (error) {
    if (isAdminConfigurationError(error)) {
      return null;
    }

    throw error;
  }
}

export function getDevelopmentPublicFallbackMessage() {
  return "Firebase Admin SDK is not configured, so this development response was validated but not persisted.";
}

export function apiJson<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, init);
}

export function apiError(error: unknown) {
  const payload = getSafeErrorPayload(error);
  return NextResponse.json(payload.body, { status: payload.status });
}

export function sourceMetaForRepository(repository: AdminRepository, warnings: string[] = []) {
  return createSourceMeta(repository.source, warnings);
}

export function publicAdminConfigurationError() {
  return new AdminConfigurationError(
    "Firebase Admin SDK credentials are required before public applications can be persisted."
  );
}
