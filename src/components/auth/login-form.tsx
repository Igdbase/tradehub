"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { getFirebaseAuthErrorMessage } from "@/lib/firebase/errors";
import {
  resolvePostLoginPath,
  sanitizeNextPath,
  signInWithTradeHubEmail
} from "@/lib/firebase/auth";
import { useAuthUser } from "@/lib/auth/use-auth-user";

type LoginFormProps = {
  initialNextPath?: string | null;
};

let postLoginNavigationStarted = false;

export function LoginForm({ initialNextPath }: LoginFormProps) {
  const { configError, session } = useAuthUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestedNext = sanitizeNextPath(initialNextPath);

  const redirectOnce = useCallback((path: string) => {
    if (postLoginNavigationStarted) {
      return false;
    }

    postLoginNavigationStarted = true;
    window.location.replace(path);
    return true;
  }, []);

  useEffect(() => {
    if (session.status === "signed_out") {
      postLoginNavigationStarted = false;
      return;
    }

    if (session.status === "signed_in" && session.claimsLoaded) {
      redirectOnce(resolvePostLoginPath(session.role, requestedNext));
    }
  }, [redirectOnce, requestedNext, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const credentials = await signInWithTradeHubEmail(email.trim(), password);
      const tokenResult = await credentials.user.getIdTokenResult(true);
      const nextRole = tokenResult.claims.role as string | undefined;
      const nextPath = resolvePostLoginPath(
        nextRole === "super_admin" || nextRole === "influencer" || nextRole === "student"
          ? nextRole
          : null,
        requestedNext
      );

      redirectOnce(nextPath);
    } catch (error) {
      setErrorMessage(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 items-center py-8 sm:py-12">
      <section className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)]">
        <div className="hero-panel px-6 py-7 sm:px-8 sm:py-9">
          <p className="eyebrow">Firebase auth foundation</p>
          <h1 className="mt-4 max-w-3xl text-[clamp(2.4rem,4vw,4.25rem)] font-semibold tracking-[-0.05em] text-[color:var(--label)]">
            Sign in to the right TradeHub surface without crossing roles.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[color:var(--label2)] sm:text-base">
            Super Admins land in the operator control room. Influencers land in their workspace.
            Students stay in the app shell. The role comes from Firebase claims, not from anything
            a user can choose in the browser.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--glass)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Super Admin
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
                Owner bootstrap sets the first platform operator role server-side.
              </p>
            </div>
            <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--glass)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Influencer
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
                Workspace claims keep branded surfaces separate from students and operators.
              </p>
            </div>
            <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:var(--glass)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
                Student
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
                Invite-driven onboarding stays future-ready without opening admin data.
              </p>
            </div>
          </div>
        </div>

        <GlassCard className="space-y-6 p-6 sm:p-8">
          <div className="space-y-3">
            <p className="eyebrow">Email and password</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--label)]">
              Welcome back to TradeHub
            </h2>
            <p className="text-sm leading-7 text-[color:var(--label2)]">
              Use the account created in Firebase Authentication. After bootstrap, sign out and
              back in once to pick up any new claims.
            </p>
          </div>

          {configError ? (
            <div className="rounded-[22px] border border-[color:color-mix(in_srgb,var(--amber)_32%,transparent)] bg-[color:color-mix(in_srgb,var(--amber-bg)_86%,transparent)] p-4 text-sm leading-6 text-[color:var(--label2)]">
              {configError}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-[color:var(--label)]">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="focus-ring h-12 w-full rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] px-4 text-sm text-[color:var(--label)] placeholder:text-[color:var(--label3)]"
                placeholder="owner@tradehub.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium text-[color:var(--label)]">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="focus-ring h-12 w-full rounded-[18px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass)_76%,transparent)] px-4 text-sm text-[color:var(--label)] placeholder:text-[color:var(--label3)]"
                placeholder="Enter your password"
                required
              />
            </div>

            {errorMessage ? (
              <p
                className="rounded-[18px] border border-[color:color-mix(in_srgb,var(--amber)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--amber-bg)_84%,transparent)] px-4 py-3 text-sm leading-6 text-[color:var(--label2)]"
                aria-live="polite"
              >
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" variant="primary" disabled={isSubmitting || Boolean(configError)}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
              <Button href="/" variant="secondary">
                Back to landing
              </Button>
            </div>
          </form>

          <div className="rounded-[22px] border border-[color:var(--line)] bg-[color:color-mix(in_srgb,var(--glass-hi)_80%,transparent)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--label3)]">
              Risk-aware note
            </p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--label2)]">
              TradeHub route gating improves UX and keeps role surfaces separate, but the real data
              boundary still lives in Firebase rules and server-only Admin SDK code.
            </p>
            {requestedNext ? (
              <p className="mt-2 text-xs text-[color:var(--label3)]">
                Requested route after login: <span className="tabular-nums">{requestedNext}</span>
              </p>
            ) : null}
          </div>

          <p className="text-sm text-[color:var(--label3)]">
            Student invite links still begin at{" "}
            <Link href="/join/apexfx" className="text-[color:var(--accent)] underline-offset-4 hover:underline">
              /join/apexfx
            </Link>
            .
          </p>
        </GlassCard>
      </section>
    </div>
  );
}
