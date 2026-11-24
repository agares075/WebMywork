import { requirePageSession } from "@/lib/auth/session";
import { initializeSpreadsheet } from "@/lib/sheets/initialize";
import { connectionFailure } from "@/lib/sheets/errors";
import { WorkspaceScreen } from "@/components/settings/workspace-screen";
import type { ConnectionResult } from "@/types/sheets";

export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const session = await requirePageSession();
  let initial: ConnectionResult;
  try { initial = { ok: true, connection: await initializeSpreadsheet() }; }
  catch (error) { initial = connectionFailure(error); }
  return <WorkspaceScreen email={session.user?.email ?? ""} initial={initial} demoEnabled={process.env.ENABLE_DEMO_SEED === "true"} />;
}
