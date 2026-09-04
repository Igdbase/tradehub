import "server-only";

import { metaApiDemoOrderAdapter, metaApiLiveCanaryOrderAdapter, verifyMetaApiConnection } from "@/lib/crypto-execution/forex/metaapi-adapter";
import type {
  ForexConnectionProvider
} from "@/types/crypto-execution";

export function getForexConnectionVerificationAdapter(provider: ForexConnectionProvider) {
  switch (provider) {
    case "metaapi":
      return verifyMetaApiConnection;
    default:
      return verifyMetaApiConnection;
  }
}

export function getForexDemoOrderPlacementAdapter(provider: ForexConnectionProvider) {
  switch (provider) {
    case "metaapi":
      return metaApiDemoOrderAdapter;
    default:
      return metaApiDemoOrderAdapter;
  }
}

export function getForexLiveCanaryOrderPlacementAdapter(provider: ForexConnectionProvider) {
  switch (provider) {
    case "metaapi":
      return metaApiLiveCanaryOrderAdapter;
    default:
      return metaApiLiveCanaryOrderAdapter;
  }
}

export type {
  ForexDemoOrderCancelInput,
  ForexDemoOrderInput,
  ForexDemoOrderPlacementAdapter,
  ForexDemoOrderResult,
  ForexDemoOrderStatusInput,
  ForexLiveCanaryOrderInput,
  ForexLiveCanaryOrderPlacementAdapter,
  ForexLiveCanaryOrderResult,
  ForexConnectionVerificationAdapter,
  ForexConnectionVerificationInput,
  ForexConnectionVerificationResult
} from "@/lib/crypto-execution/forex/types";
