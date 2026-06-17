"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { dashboardPrimaryBtn } from "@/components/marketing/marketing-styles";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const ui = useClinicalUi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/patients";
  const demoHint = searchParams.get("demo") === "1";
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState(demoHint ? "demo@caresignal.ai" : "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabaseEnabled = isSupabaseAuthConfigured();

  useEffect(() => {
    if (demoHint && !password) {
      setPassword("caresignal");
    }
  }, [demoHint, password]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (supabaseEnabled) {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) throw new Error(ui.auth.configError);

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;

        router.replace(nextPath);
        router.refresh();
        return;
      }

      const response = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? ui.auth.invalidCredentials);
      }

      router.replace(nextPath);
      router.refresh();
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error ? nextError.message : ui.auth.genericError,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title={ui.auth.loginTitle}
      subtitle={supabaseEnabled ? ui.auth.subtitleSupabase : ui.auth.subtitleDemo}
      footer={
        <p className="text-center text-[12px] text-[color:var(--cs-text-soft)]">
          {ui.auth.noAccount}{" "}
          <Link href="/register" className="font-semibold text-[color:var(--cs-primary)] hover:underline">
            {ui.auth.registerLink}
          </Link>
        </p>
      }
    >
      {supabaseEnabled ? <OAuthButtons nextPath={nextPath} /> : null}
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <AuthField
          label={ui.auth.email}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="clinician@hospital.vn"
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[color:var(--cs-text)]">
              {ui.auth.password}
            </span>
            <Link
              href="/forgot-password"
              className="text-[11px] font-semibold text-[color:var(--cs-primary)] hover:underline"
            >
              {ui.auth.forgotPassword}
            </Link>
          </div>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="dashboard-input h-11 w-full rounded-[0.75rem] px-3 text-[14px]"
          />
        </div>

        {!supabaseEnabled ? <AuthMessage>{ui.auth.demoHint}</AuthMessage> : null}
        {oauthError ? <AuthMessage tone="error">{oauthError}</AuthMessage> : null}
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}

        <button
          type="submit"
          disabled={loading}
          className={`${dashboardPrimaryBtn} w-full disabled:opacity-60`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {ui.auth.submit}
        </button>
      </form>
    </AuthCard>
  );
}
