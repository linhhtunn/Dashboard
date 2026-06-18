"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { dashboardPrimaryBtn } from "@/components/marketing/marketing-styles";
import { useClinicalUi } from "@/lib/i18n/use-clinical-ui";
import { isSupabaseAuthConfigured } from "@/lib/auth/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const ui = useClinicalUi();
  const supabaseEnabled = isSupabaseAuthConfigured();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (supabaseEnabled) {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) throw new Error(ui.auth.configError);

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/reset-password` },
        );
        if (resetError) throw resetError;

        setSuccess(ui.auth.forgotSuccess);
        return;
      }

      setSuccess(ui.auth.forgotSuccessDemo);
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
      title={ui.auth.forgotTitle}
      subtitle={ui.auth.forgotSubtitle}
      footer={
        <p className="text-center text-[12px] text-[color:var(--cs-text-soft)]">
          <Link href="/login" className="font-semibold text-[color:var(--cs-primary)] hover:underline">
            {ui.auth.backToLogin}
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <AuthField
          label={ui.auth.email}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}
        {success ? <AuthMessage tone="success">{success}</AuthMessage> : null}

        <button
          type="submit"
          disabled={loading || Boolean(success)}
          className={`${dashboardPrimaryBtn} w-full disabled:opacity-60`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {ui.auth.forgotSubmit}
        </button>
      </form>
    </AuthCard>
  );
}
