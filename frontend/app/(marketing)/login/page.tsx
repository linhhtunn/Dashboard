import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/LoginForm";
import { getServerSession } from "@/lib/auth/server-session";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/patients");
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
