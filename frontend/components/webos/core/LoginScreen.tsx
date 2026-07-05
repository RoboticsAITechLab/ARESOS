"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useOS } from "@/hooks/webos/useOS";
import { playScanSound, playSuccessSound } from "@/utils/webos/audio";
import { AresLogo } from "./AresLogo";

interface LoginScreenProps {
  onSuccess: () => void;
}

const fadeIn = (delay: number, reduced: boolean) => ({
  initial: reduced ? false : ({ opacity: 0, y: 8 } as const),
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] as const, delay: reduced ? 0 : delay },
});

const getInitialPassword = () => {
  if (typeof window === "undefined") return null;

  let pwd = localStorage.getItem("aresos_admin_password") || process.env.NEXT_PUBLIC_LOGIN_PASSWORD || null;
  if (!pwd) {
    pwd = "1462007";
    localStorage.setItem("aresos_admin_password", pwd);
  }
  return pwd;
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { settings, currentUser } = useOS();
  const shouldReduceMotion = useReducedMotion();

  const [passkey, setPasskey] = useState("");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "denied">("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const [storedPassword, setStoredPassword] = useState<string | null>(getInitialPassword);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRetinalScan = () => {
    if (scanState === "scanning" || scanState === "success") return;

    setScanState("scanning");
    setScanProgress(0);
    setErrorMessage("");

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        const next = prev + 20;
        if (next === 40) {
          playScanSound((settings?.volume ?? 80) / 100);
        }
        if (next >= 100) {
          clearInterval(interval);
          setScanState("success");
          return 100;
        }
        return next;
      });
    }, 55);
  };

  const handleSetupPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = newPassword;
    if (!cleanPassword) {
      setErrorMessage("Enter a password to continue.");
      return;
    }
    if (cleanPassword.length < 4) {
      setErrorMessage("Password must be at least 4 characters.");
      return;
    }
    if (cleanPassword.includes(" ")) {
      setErrorMessage("Password cannot contain spaces.");
      return;
    }
    if (cleanPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("aresos_admin_password", cleanPassword);
        setStoredPassword(cleanPassword);
        setIsFirstTimeSetup(false);
        setErrorMessage("");
        handleRetinalScan();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Password could not be saved.");
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (scanState !== "success") {
      handleRetinalScan();
      setErrorMessage("Preparing desktop session. Try again.");
      return;
    }

    const correctPassword =
      storedPassword ||
      localStorage.getItem("aresos_admin_password") ||
      process.env.NEXT_PUBLIC_LOGIN_PASSWORD;
    if (correctPassword && passkey !== correctPassword) {
      setErrorMessage("The password is incorrect.");
      return;
    }

    setScanState("scanning");
    setScanProgress(90);
    playSuccessSound((settings?.volume ?? 80) / 100);

    setTimeout(() => {
      onSuccess();
    }, 200);
  };

  useEffect(() => {
    if (!isFirstTimeSetup) {
      const timer = setTimeout(() => {
        handleRetinalScan();
      }, 260);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstTimeSetup]);

  const isAuthenticating = scanState === "scanning" && scanProgress < 100;

  return (
    <div className="fixed inset-0 z-[99999] h-dvh max-h-dvh w-screen overflow-hidden bg-[#050505] font-mono text-zinc-100 select-none">
      <div className="cyber-grid" />
      <style jsx global>{`
        input.aresos-login-field:-webkit-autofill,
        input.aresos-login-field:-webkit-autofill:hover,
        input.aresos-login-field:-webkit-autofill:focus,
        input.aresos-login-field:-webkit-autofill:active {
          -webkit-text-fill-color: #e4e4e7;
          caret-color: #f4f4f5;
          box-shadow: 0 0 0 1000px #080808 inset;
          transition: background-color 9999s ease-out 0s;
        }
      `}</style>
      <div className="flex h-full w-full items-center justify-center px-5 py-6 sm:px-8">
        <main className="flex h-full max-h-[54rem] w-full max-w-[27rem] flex-col items-center justify-center">
          <motion.div
            className="flex w-full flex-col items-center"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <AresLogo
              entrance={false}
              pulse
              className="size-[clamp(14rem,min(50vh,84vw),25rem)] shrink-0 [@media(max-height:700px)]:size-[clamp(11.5rem,44vh,19rem)]"
            />

            <motion.section
              className="mt-[clamp(0.25rem,1vh,0.65rem)] w-full text-center"
              {...fadeIn(0.1, !!shouldReduceMotion)}
            >
              <h1 className="text-[clamp(0.95rem,2vh,1.15rem)] font-semibold uppercase tracking-[0.34em] text-zinc-200">
                ARESOS
              </h1>
              <p className="mt-1.5 text-[clamp(0.78rem,1.7vh,0.9rem)] font-normal text-zinc-500">
                System Login
              </p>
              <p className="mt-1 text-[11px] font-medium tracking-[0.08em] text-zinc-700">
                Local Session / Workspace Ready
              </p>
            </motion.section>

            <motion.div
              className="mt-[clamp(0.9rem,2.4vh,1.35rem)] w-full max-w-[16.5rem]"
              {...fadeIn(0.18, !!shouldReduceMotion)}
            >
              {isFirstTimeSetup ? (
                <form onSubmit={handleSetupPassword} className="space-y-3.5">
                  <Field label="Password" htmlFor="new-passkey">
                    <input
                      id="new-passkey"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={fieldClass}
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                  <Field label="Confirm Password" htmlFor="confirm-passkey">
                    <input
                      id="confirm-passkey"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={fieldClass}
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                  {errorMessage && <ErrorText message={errorMessage} />}
                  <SubmitButton label="Continue" disabled={false} reduced={!!shouldReduceMotion} />
                </form>
              ) : (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <Field label="Username" htmlFor="username">
                    <input
                      id="username"
                      type="text"
                      readOnly
                      value={currentUser?.username || "guest"}
                      className={`${fieldClass} cursor-default text-zinc-500`}
                      tabIndex={-1}
                      aria-readonly
                    />
                  </Field>
                  <Field label="Password" htmlFor="passkey">
                    <input
                      id="passkey"
                      type="password"
                      value={passkey}
                      onChange={(e) => setPasskey(e.target.value)}
                      className={fieldClass}
                      autoComplete="current-password"
                      autoFocus
                    />
                  </Field>
                  {errorMessage && <ErrorText message={errorMessage} />}
                  <SubmitButton
                    label={isAuthenticating ? "Signing In" : "Sign In"}
                    disabled={isAuthenticating}
                    reduced={!!shouldReduceMotion}
                  />
                </form>
              )}
            </motion.div>

            <motion.footer
              className="mt-[clamp(1rem,3vh,1.8rem)] text-center"
              {...fadeIn(0.26, !!shouldReduceMotion)}
            >
              <p className="text-[11px] leading-none tracking-[0.08em] text-zinc-700">
                ARESOS 1.0
              </p>
            </motion.footer>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

const fieldClass =
  "aresos-login-field w-full rounded-[3px] border border-zinc-800 bg-[#080808] px-3 py-2.5 text-[15px] leading-6 text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-zinc-500 focus:bg-[#090909] focus:ring-0 focus-visible:border-zinc-400";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-left text-[11px] font-medium text-zinc-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <p className="text-center text-xs leading-5 text-[#d23b42]" role="alert">
      {message}
    </p>
  );
}

function SubmitButton({
  label,
  disabled,
  reduced,
}: {
  label: string;
  disabled: boolean;
  reduced: boolean;
}) {
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      whileHover={reduced || disabled ? undefined : { backgroundColor: "#9f1239" }}
      whileTap={reduced || disabled ? undefined : { scale: 0.99 }}
      className="mt-2 w-full rounded-[3px] border border-rose-900/70 bg-[#741021] py-2.5 text-[14px] font-medium leading-5 text-zinc-100 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-rose-800 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:cursor-wait disabled:border-zinc-800 disabled:bg-zinc-800 disabled:text-zinc-500"
    >
      {label}
    </motion.button>
  );
}
