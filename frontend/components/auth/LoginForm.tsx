"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { BrandLogo } from "@/components/marketing/BrandLogo";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { dashboardPrimaryBtn, marketingContainer } from "@/components/marketing/marketing-styles";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const ui = useClinicalUi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/patients";
  const demoHint = searchParams.get("demo") === "1";

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
        if (!supabase) {
          throw new Error(ui.auth.configError);
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          throw signInError;
        }

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
    <>
      <MarketingNavbar />
      <div className={`flex min-h-[calc(100dvh-88px)] items-center justify-center py-8 ${marketingContainer}`}>
        <div className="dashboard-surface w-full max-w-md rounded-[1.15rem] p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <BrandLogo />
            <h1 className="mt-5 text-[1.35rem] font-semibold text-[color:var(--cs-heading)]">
              {ui.auth.title}
            </h1>
            <p className="mt-1 text-[13px] text-[color:var(--cs-text-soft)]">
              {supabaseEnabled ? ui.auth.subtitleSupabase : ui.auth.subtitleDemo}
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <label className="block space-y-1.5">
              <span className="text-[12px] font-semibold text-[color:var(--cs-text)]">
                {ui.auth.email}
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="dashboard-input h-11 w-full rounded-[0.75rem] px-3 text-[14px]"
                placeholder="clinician@hospital.vn"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-semibold text-[color:var(--cs-text)]">
                {ui.auth.password}
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="dashboard-input h-11 w-full rounded-[0.75rem] px-3 text-[14px]"
              />
            </label>

            {!supabaseEnabled ? (
              <p className="rounded-[0.7rem] border border-[color:rgba(0,150,136,0.2)] bg-[color:rgba(0,150,136,0.08)] px-3 py-2 text-[12px] text-[color:var(--cs-text)]">
                {ui.auth.demoHint}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-[0.7rem] border border-[color:rgba(229,72,77,0.22)] bg-[color:rgba(229,72,77,0.08)] px-3 py-2 text-[12px] text-[color:var(--cs-danger)]">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className={`${dashboardPrimaryBtn} w-full disabled:opacity-60`}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {ui.auth.submit}
            </button>
          </form>

          <p className="mt-5 text-center text-[12px] text-[color:var(--cs-text-soft)]">
            <Link
              href="/"
              className="font-semibold text-[color:var(--cs-primary)] hover:underline"
            >
              {ui.auth.backHome}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
