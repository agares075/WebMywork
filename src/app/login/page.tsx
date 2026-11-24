import { redirect } from "next/navigation";
import { getConfiguration } from "@/lib/env";
import { getAllowedSession } from "@/lib/auth/session";
import { LoginScreen } from "@/components/auth/login-screen";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const configuration = getConfiguration();
  if (configuration.success && await getAllowedSession()) redirect("/");
  const { error } = await searchParams;
  const missingFields = configuration.success ? [] : [...new Set(configuration.error.issues.map((issue) => issue.path.join(".")))];
  return <LoginScreen missingFields={missingFields} error={error ? (error === "AccessDenied" ? t.login.accessDenied : t.login.failed) : undefined} />;
}
