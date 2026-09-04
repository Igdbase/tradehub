export type SurfaceKey =
  | "public"
  | "super-admin"
  | "influencer"
  | "student";

export type MetricTone = "neutral" | "accent" | "green" | "amber";

export interface NavItem {
  label: string;
  href: string;
  description: string;
  surface: SurfaceKey;
}

export interface SurfaceCardItem {
  label: string;
  title: string;
  href: string;
  description: string;
  prompt: string;
  surface: SurfaceKey;
}

export interface MetricItem {
  label: string;
  value: string;
  tone?: MetricTone;
}

export interface DetailItem {
  title: string;
  body: string;
}

export interface RoadmapItem {
  label: string;
  prompt: string;
  detail: string;
}

export interface PolicySection {
  title: string;
  body: string;
}

export * from "@/types/admin";
export * from "@/types/admin-api";
export * from "@/types/course-hub";
export * from "@/types/courses";
export * from "@/types/journal";
export * from "@/types/onboarding";
export * from "@/types/payments";
export * from "@/types/signals";
export * from "@/types/student-app";
export * from "@/types/users";
export * from "@/types/workspace";
export * from "@/types/workspace-dashboard";
