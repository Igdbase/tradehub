import type { Metadata } from "next";

export const appConfig = {
  name: "TradeHub",
  shortName: "TradeHub",
  description:
    "Multi-tenant white-label platform for trading educators with protected workspaces, Paystack-first subscriptions, optional Solana Pay / USDC checkout, privacy-aware student journals, and operator review flows.",
  url: "https://tradehub.com",
  stage: "Stage 14",
  tagline:
    "Launch-hardened public, admin, workspace, and student routes with scoped auth, policy clarity, payment ops, and privacy-first summaries."
} as const;

type MetadataInput = {
  title?: string;
  description?: string;
  pathname?: string;
};

export function buildMetadata({
  title,
  description = appConfig.description,
  pathname = "/"
}: MetadataInput = {}): Metadata {
  const resolvedTitle = title ? `${title} | ${appConfig.name}` : appConfig.name;

  return {
    metadataBase: new URL(appConfig.url),
    title: resolvedTitle,
    description,
    applicationName: appConfig.name,
    alternates: {
      canonical: pathname
    },
    openGraph: {
      title: resolvedTitle,
      description,
      url: pathname,
      siteName: appConfig.name,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description
    }
  };
}

export const defaultMetadata = buildMetadata();
