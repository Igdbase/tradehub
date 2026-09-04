export type TradeHubRole = "super_admin" | "influencer" | "student";

export type AuthSession = {
  status: "loading" | "signed_out" | "signed_in";
  uid: string | null;
  email: string | null;
  role: TradeHubRole | null;
  workspaceId: string | null;
  claimsLoaded: boolean;
};

export type AuthContextValue = {
  session: AuthSession;
  configError: string | null;
  isConfigured: boolean;
  refreshClaims: () => Promise<AuthSession>;
  signOut: () => Promise<void>;
};
