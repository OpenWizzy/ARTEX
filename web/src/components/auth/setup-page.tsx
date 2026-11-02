import { useEffect, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";

import { useLocaleNavigate } from "@/components/common/locale-link";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";

export default function SetupPage() {
  const { t } = useLingui();
  const navigate = useLocaleNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  // 查不到初始化状态时不能默认当成"未初始化"——那样会把初始化表单摆给一个
  // 其实已经设过密码的实例，用户照着填就会覆盖掉原密码。此时关闭入口。
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    api
      .authStatus()
      .then(({ initialized }) => {
        if (initialized) void navigate({ to: "/login", replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t`Unable to connect to the backend service`);
        setUnavailable(true);
      })
      .finally(() => setChecking(false));
  }, [navigate, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t`The two passwords don't match`);
      return;
    }
    if (password.length < 8) {
      setError(t`Password must be at least 8 characters`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token } = await api.initPassword(password);
      auth.setToken(token);
      void navigate({ to: "/function/tasks", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t`Initialization failed`);
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <div className="flex h-dvh">
      {/* Left panel */}
      <div className="hidden flex-col items-center justify-center bg-primary p-12 text-center lg:flex lg:w-1/3">
        <div className="relative flex items-center justify-center">
          <div className="absolute size-80 rounded-full border border-primary-foreground/10" />
          <div className="absolute size-60 rounded-full border border-primary-foreground/15" />
          <div className="absolute size-40 rounded-full border border-primary-foreground/20" />
          <img src="/logo.png" alt="ARTEX" width={160} height={160} className="relative brightness-0 invert" />
        </div>
      </div>

      {/* Right panel */}
      <div className="relative flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="absolute top-4 right-4">
          <LocaleSwitcher variant="outline" />
        </div>
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-medium tracking-tight">
              {unavailable ? t`Can't confirm initialization status` : t`Initialize password`}
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              {unavailable
                ? t`The backend or database is temporarily unavailable. To avoid overwriting an existing password on this instance, initialization is temporarily closed — restore the service and try again.`
                : t`First time using ARTEX — set a login password for the account (at least 8 characters)`}
            </p>
          </div>
          {unavailable ? (
            <div className="flex flex-col gap-4">
              {error && <p className="text-center text-sm text-destructive">{error}</p>}
              <Button type="button" className="w-full" onClick={() => window.location.reload()}>
                <Trans>Retry</Trans>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">
                  <Trans>New password</Trans>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t`At least 8 characters`}
                  autoFocus
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">
                  <Trans>Confirm password</Trans>
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t`Re-enter the password`}
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !password || !confirm}>
                {loading ? t`Saving…` : t`Set password and sign in`}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
