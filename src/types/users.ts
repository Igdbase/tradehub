import type { JournalPrivacy } from "@/types/journal";
import type { CopierSettings, CopierStatus } from "@/types/signals";
import type { IsoDateString } from "@/types/workspace";

export type UserRole = "super_admin" | "influencer" | "student";

export type SubscriptionStatus = "active" | "trialing" | "cancelled" | "past_due";

export type AccountMode = "auto_copy" | "signal_alerts";

export type BrokerLinkedState = "linked" | "unlinked" | "error";

export type PropFirmPlatform =
  | "not_applicable"
  | "mt4"
  | "mt5"
  | "ctrader"
  | "dxtrade"
  | "matchtrade"
  | "tradovate"
  | "ninjatrader"
  | "other";

export interface SuperAdminProfile {
  userId: string;
  role: "super_admin";
  displayName: string;
  email: string;
}

export interface InfluencerProfile {
  userId: string;
  role: "influencer";
  workspaceId: string;
  displayName: string;
  email: string;
  handleOrChannel: string;
  audienceSize: number;
  market: "forex" | "crypto" | "both";
  monetizationMethod: string;
}

export interface StudentBrokerLink {
  type: "crypto" | "forex_personal" | "prop_firm";
  exchange:
    | "binance"
    | "bybit"
    | "mt4"
    | "mt5"
    | "ctrader"
    | "dxtrade"
    | "matchtrade"
    | "tradovate"
    | "ninjatrader"
    | "other";
  status: BrokerLinkedState;
  platform: PropFirmPlatform;
  apiKeyRef?: string;
}

export interface StudentProfile {
  userId: string;
  role: "student";
  workspaceId: string;
  email: string;
  displayName: string;
  joinedAt: IsoDateString;
  subscriptionTierId: string;
  subscriptionTierName: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStart: IsoDateString;
  subscriptionRenewDate?: IsoDateString;
  trialEndsAt?: IsoDateString;
  paystackCustomerCode?: string;
  accountMode: AccountMode;
  brokerLinked: StudentBrokerLink;
  copierStatus: CopierStatus;
  copierActive: boolean;
  copierSettings: CopierSettings;
  journalPrivacy: JournalPrivacy;
  twoFactorEnabled: boolean;
  riskDisclosureAcceptedAt: IsoDateString;
  lastActiveAt: IsoDateString;
  courseProgressPercent: number;
}
