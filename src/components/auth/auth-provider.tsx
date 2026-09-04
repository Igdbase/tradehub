"use client";

import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onIdTokenChanged } from "firebase/auth";
import type { AuthContextValue, AuthSession } from "@/types/auth";
import {
  getFirebaseAuthClient,
  getFirebaseClientConfigState
} from "@/lib/firebase/client";
import {
  getInitialLoadingSession,
  getSignedOutSession,
  hydrateAuthSession,
  signOutTradeHubUser
} from "@/lib/firebase/auth";

export const AuthContext = createContext<AuthContextValue | null>(null);

function getSignedOutState() {
  return getSignedOutSession();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configState = useMemo(() => getFirebaseClientConfigState(), []);
  const [session, setSession] = useState<AuthSession>(
    configState.configured ? getInitialLoadingSession() : getSignedOutState()
  );
  const [configError, setConfigError] = useState<string | null>(configState.errorMessage);

  useEffect(() => {
    if (!configState.configured) {
      setSession(getSignedOutState());
      setConfigError(configState.errorMessage);
      return;
    }

    const auth = getFirebaseAuthClient();

    if (!auth) {
      setSession(getSignedOutState());
      setConfigError("Firebase Auth could not be initialized for this browser session.");
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setSession(getSignedOutState());
        setConfigError(null);
        return;
      }

      setSession({
        status: "loading",
        uid: user.uid,
        email: user.email,
        role: null,
        workspaceId: null,
        claimsLoaded: false
      });

      try {
        const nextSession = await hydrateAuthSession(user);
        setSession(nextSession);
        setConfigError(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "TradeHub could not read role claims for this session.";

        setSession({
          status: "signed_in",
          uid: user.uid,
          email: user.email,
          role: null,
          workspaceId: null,
          claimsLoaded: true
        });
        setConfigError(message);
      }
    });

    return unsubscribe;
  }, [configState.configured, configState.errorMessage]);

  async function refreshClaims() {
    const auth = getFirebaseAuthClient();
    const currentUser = auth?.currentUser;

    if (!currentUser) {
      const signedOutSession = getSignedOutState();
      setSession(signedOutSession);
      return signedOutSession;
    }

    const nextSession = await hydrateAuthSession(currentUser, true);
    setSession(nextSession);
    setConfigError(null);
    return nextSession;
  }

  async function signOut() {
    await signOutTradeHubUser();
    setSession(getSignedOutState());
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      configError,
      isConfigured: configState.configured,
      refreshClaims,
      signOut
    }),
    [configError, configState.configured, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
