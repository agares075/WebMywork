"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { GoogleIcon, Icon } from "@/components/ui/icon";
import { t } from "@/lib/i18n";

type Props = { action: "signIn" | "signOut"; disabled?: boolean; reconnect?: boolean };

export function AuthButton({ action, disabled = false, reconnect = false }: Props) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const login = action === "signIn";
  async function handleClick() {
    setPending(true);
    setFailed(false);
    try {
      if (login) await signIn("google", { callbackUrl: "/" });
      else await signOut({ callbackUrl: "/login" });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }
  return <>
    <button type="button" className={`button ${login ? "button-primary" : "button-quiet"}`} disabled={disabled || pending} onClick={handleClick} aria-busy={pending}>
      {login ? <GoogleIcon /> : <Icon name="logout" />}
      {pending ? t.login.pending : login ? (reconnect ? t.workspace.reconnect : t.login.google) : t.workspace.signOut}
    </button>
    {failed && <p className="error-text" role="alert">{t.login.failed}</p>}
  </>;
}
