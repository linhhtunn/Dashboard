"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { dashboardPrimaryBtn } from "@/components/marketing/marketing-styles";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function RegisterForm() {
  const ui = useClinicalUi();
  const router = useRouter();
  const supabaseEnabled = isSupabaseAuthConfigured();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError(ui.auth.passwordMismatch);
      setLoading(false);
      return;
    }

    try {
      if (supabaseEnabled) {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) throw new Error(ui.auth.configError);

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
          },
        });
        if (signUpError) throw signUpError;

        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInError) throw signInError;
        }

        router.replace("/dashboard");
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
        throw new Error(payload?.error ?? ui.auth.genericError);
      }

      router.replace("/dashboard");
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
      title={ui.auth.registerTitle}
      subtitle={supabaseEnabled ? ui.auth.registerSubtitleSupabase : ui.auth.registerSubtitleDemo}
      footer={
        <p className="text-center text-[12px] text-[color:var(--cs-text-soft)]">
          {ui.auth.hasAccount}{" "}
          <Link href="/login" className="font-semibold text-[color:var(--cs-primary)] hover:underline">
            {ui.auth.loginLink}
          </Link>
        </p>
      }
    >
      {supabaseEnabled ? <OAuthButtons nextPath="/dashboard" /> : null}
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <AuthField
          label={ui.auth.fullName}
          type="text"
          required
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
        <AuthField
          label={ui.auth.email}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <AuthField
          label={ui.auth.password}
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={ui.auth.passwordHint}
        />
        <AuthField
          label={ui.auth.confirmPassword}
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {!supabaseEnabled ? <AuthMessage>{ui.auth.demoHint}</AuthMessage> : null}
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        {success ? <AuthMessage tone="success">{success}</AuthMessage> : null}

        <button
          type="submit"
          disabled={loading || Boolean(success)}
          className={`${dashboardPrimaryBtn} w-full disabled:opacity-60`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {ui.auth.registerSubmit}
        </button>
      </form>
    </AuthCard>
  );
}
