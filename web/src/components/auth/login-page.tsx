import { useEffect, useRef, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { useLocaleNavigate } from "@/components/common/locale-link";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { auth } from "@/lib/auth";
import { localizePath } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useLingui();
  const navigate = useLocaleNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [readToEnd, setReadToEnd] = useState(false);
  const termsBodyRef = useRef<HTMLDivElement>(null);

  // 滚动到条款底部（含无需滚动即可完整展示的情况）方可点击「同意」。
  function handleTermsScroll() {
    const el = termsBodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadToEnd(true);
  }

  useEffect(() => {
    if (!termsOpen) return;
    // 打开时重置，并处理内容本就不足一屏、无法触发滚动的场景。
    setReadToEnd(false);
    const el = termsBodyRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) setReadToEnd(true);
  }, [termsOpen]);

  useEffect(() => {
    // 已登录直接进主界面。
    const token = auth.getToken();
    if (token) {
      // localStorage 可能仍有凭据但 cookie 已丢失。先同步，再发起全新请求，
      // 避免服务端守卫或路由缓存把跳转送回仍处于 checking 状态的登录页。
      auth.setToken(token);
      window.location.replace(localizePath("/function/tasks"));
      return;
    }
    api
      .authStatus()
      .then(({ initialized }) => {
        if (!initialized) void navigate({ to: "/setup", replace: true });
      })
      .catch(() => setError(t`Unable to connect to the backend service`))
      .finally(() => setChecking(false));
  }, [navigate, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError(t`Please read and agree to the Terms of Use first`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { token } = await api.login("ARTEX", password);
      auth.setToken(token);
      window.location.replace(localizePath("/function/tasks"));
    } catch {
      setError(t`Incorrect username or password`);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Trans>Checking login status…</Trans>
      </div>
    );
  }

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
              <Trans>Sign in</Trans>
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              <Trans>Welcome back — enter your password to continue using ARTEX</Trans>
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">
                <Trans>Username</Trans>
              </Label>
              <Input id="username" value="ARTEX" readOnly className="bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                <Trans>Password</Trans>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t`Enter your password`}
                autoFocus
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="agree-terms"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="agree-terms" className="text-sm font-normal leading-relaxed text-muted-foreground">
                <Trans>
                  I have read and agree to the
                  <button
                    type="button"
                    onClick={() => setTermsOpen(true)}
                    className="mx-0.5 font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Terms of Use
                  </button>
                </Trans>
              </Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || !password || !agreed}>
              {loading ? t`Signing in…` : t`Sign in`}
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-2xl">
          <DialogHeader className="flex-row items-center gap-3 border-b px-6 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-base">
                <Trans>ARTEX Terms of Use and Disclaimer</Trans>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                <Trans>
                  Version v1.0 · Effective 2026-09-18 · Please read all of the following terms in full before signing in
                </Trans>
              </p>
            </div>
          </DialogHeader>

          <div
            ref={termsBodyRef}
            onScroll={handleTermsScroll}
            className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-muted-foreground"
          >
            <p className="rounded-lg border bg-muted/40 p-3 text-foreground/80">
              <Trans>
                These Terms of Use and Disclaimer (the "Terms") are the agreement between you and the ARTEX project's
                authors and contributors regarding your use of this software. Please read and fully understand each term
                before use, especially the disclaimers, limitations of liability, and prohibitions highlighted in bold
                or colored blocks.
                <span className="font-medium text-foreground">
                  {" "}
                  Once you download, install, access, or use this software in any way, you are deemed to have read,
                  understood, and agreed to be bound by all of these Terms.
                </span>
              </Trans>
            </p>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  1
                </span>
                <Trans>Article 1 · Definitions and open-source license</Trans>
              </h4>
              <p className="pl-7">
                <Trans>
                  This software (ARTEX) is an open-source program released under the GNU Affero General Public License
                  v3.0 (AGPL-3.0). You may freely use, copy, modify, and distribute it under that license; but any
                  derivative work (including an online service offered to third parties over a network) must likewise be
                  open-sourced under AGPL-3.0 and make its complete corresponding source code available to users. The
                  full AGPL-3.0 terms are governed by the accompanying LICENSE file.
                </Trans>
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  2
                </span>
                <Trans>Article 2 · Scope of authorized use</Trans>
              </h4>
              <p className="pl-7">
                <Trans>
                  This software is intended only for personal study, code research, exploration of security principles,
                  and technical validation in a locally isolated environment you set up yourself — that is, for
                  non-offensive, non-destructive purposes such as learning, academic research, and code review. Except
                  as expressly permitted in this article, you may not use this software for any other purpose.
                </Trans>
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="flex items-center gap-2 font-medium text-destructive">
                <span className="flex size-5 items-center justify-center rounded-md bg-destructive/10 text-xs font-semibold text-destructive">
                  3
                </span>
                <AlertTriangle className="size-4" />
                <Trans>Article 3 · Prohibited conduct</Trans>
              </h4>
              <ul className="ml-7 list-decimal space-y-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 pl-8 text-foreground/80 marker:text-destructive/70">
                <li>
                  <Trans>
                    Scanning, probing, exploiting, or attacking any website, online service, or networked system owned
                    by others or third parties (whether or not authorized, and whether or not it is your own asset) is
                    strictly prohibited;
                  </Trans>
                </li>
                <li>
                  <Trans>
                    Using this software for any real penetration testing, offensive/defensive exercises, red/blue team
                    drills, or production environments is strictly prohibited;
                  </Trans>
                </li>
                <li>
                  <Trans>
                    Using this software for unlawful intrusion, data theft, extortion, denial of service (DoS/DDoS), or
                    any destructive or criminal activity is strictly prohibited;
                  </Trans>
                </li>
                <li>
                  <Trans>
                    Removing, tampering with, or circumventing any copyright, license, or security notice in this
                    software and its output is strictly prohibited;
                  </Trans>
                </li>
                <li>
                  <Trans>
                    Engaging in any conduct that violates the laws, regulations, or regulatory requirements of your
                    country or region is strictly prohibited.
                  </Trans>
                </li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  4
                </span>
                <Trans>Article 4 · Intellectual property</Trans>
              </h4>
              <p className="pl-7">
                <Trans>
                  The copyright and related intellectual property rights in this software belong to the project's
                  authors and contributors, who grant you the corresponding rights within the scope of the AGPL-3.0
                  license. Except for the rights expressly granted by that license, these Terms grant you no other
                  rights, whether express or implied.
                </Trans>
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  5
                </span>
                <Trans>Article 5 · Data and privacy</Trans>
              </h4>
              <p className="pl-7">
                <Trans>
                  This software is a self-hostable open-source program; the authors operate no centralized service and
                  do not collect or upload your usage data. All data you generate, process, or access while using it is
                  under your own control and your responsibility as to its legality and security; you bear any
                  consequences arising from improper data handling.
                </Trans>
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  6
                </span>
                <Trans>Article 6 · Compliance and legal liability</Trans>
              </h4>
              <p className="pl-7">
                <Trans>
                  You must comply on your own with all laws and regulations of your country or region on cybersecurity,
                  data security, personal information protection, computer crime, and the like (in mainland China,
                  including but not limited to the Cybersecurity Law, Data Security Law, Personal Information Protection
                  Law, and related judicial interpretations).
                  <span className="font-medium text-foreground">
                    {" "}
                    Any legal liability and consequences arising from your violation of the above laws and regulations
                    or of these Terms are borne solely by you and have nothing to do with this software's authors and
                    contributors.
                  </span>
                </Trans>
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  7
                </span>
                <Trans>Article 7 · Disclaimer and limitation of liability</Trans>
              </h4>
              <p className="pl-7">
                <Trans>
                  This software is provided "AS IS" and "AS AVAILABLE", without warranty of any kind, express or
                  implied, including but not limited to warranties of merchantability, fitness for a particular purpose,
                  accuracy, and non-infringement. To the maximum extent permitted by applicable law, this software's
                  authors and contributors are not liable for any direct, indirect, incidental, special, or
                  consequential loss arising from the use of or inability to use this software (whether or not used
                  properly), including but not limited to data loss, system damage, business interruption, lost profits,
                  or legal disputes.
                </Trans>
              </p>
            </section>

            <section className="space-y-1.5">
              <h4 className="flex items-center gap-2 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                  8
                </span>
                <Trans>Article 8 · Changes to the terms and final interpretation</Trans>
              </h4>
              <p className="pl-7">
                <Trans>
                  The authors may update these Terms from time to time as laws, regulations, or the project's
                  development require; the updated version is released with the project and takes effect from the date
                  it is published, and your continued use of this software is deemed acceptance of the revised terms. To
                  the extent permitted by law, the authors reserve the right of final interpretation of these Terms. If
                  any term is held invalid, the validity of the remaining terms is unaffected.
                </Trans>
              </p>
            </section>
          </div>

          <DialogFooter className="mx-0 mb-0 flex-col items-stretch gap-2 rounded-b-xl px-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {readToEnd ? t`You've read all the terms` : t`Scroll to the bottom of the terms before confirming`}
            </p>
            <DialogClose asChild>
              <Button
                type="button"
                disabled={!readToEnd}
                onClick={() => {
                  setAgreed(true);
                  setError("");
                }}
              >
                <Trans>I have read and agree to all the terms</Trans>
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
