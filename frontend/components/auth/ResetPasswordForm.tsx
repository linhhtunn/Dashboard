"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { dashboardPrimaryBtn } from "@/components/marketing/marketing-styles";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const ui = useClinicalUi();
  const router = useRouter();
  const supabaseEnabled = isSupabaseAuthConfigured();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(!supabaseEnabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseEnabled) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      const timeout = window.setTimeout(() => setError(ui.auth.configError), 0);
      return () => window.clearTimeout(timeout);
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
        return;
      }
      setError(ui.auth.resetSessionMissing);
    });
  }, [supabaseEnabled, ui.auth.configError, ui.auth.resetSessionMissing]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError(ui.auth.passwordMismatch);
      setLoading(false);
      return;
    }

    try {
      if (supabaseEnabled) {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) throw new Error(ui.auth.configError);

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;

        router.replace("/patients");
        router.refresh();
        return;
      }

      router.replace("/login");
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
      title={ui.auth.resetTitle}
      subtitle={ui.auth.resetSubtitle}
      footer={
        <p className="text-center text-[12px] text-[color:var(--cs-text-soft)]">
          <Link href="/login" className="font-semibold text-[color:var(--cs-primary)] hover:underline">
            {ui.auth.backToLogin}
          </Link>
        </p>
      }
    >
      {!ready && !error ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[color:var(--cs-primary)]" />
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <AuthField
            label={ui.auth.newPassword}
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={!ready}
          />
          <AuthField
            label={ui.auth.confirmPassword}
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={!ready}
          />

          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}

          <button
            type="submit"
            disabled={loading || !ready}
            className={`${dashboardPrimaryBtn} w-full disabled:opacity-60`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {ui.auth.resetSubmit}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
