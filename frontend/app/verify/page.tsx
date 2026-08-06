"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Atom, MailCheck, KeyRound, RefreshCw, LogIn } from "lucide-react";

function VerifyWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyEmail, verifyEmailByCode, resendVerification, isAuthenticated } = useAuth();

  const token = searchParams.get("token") ?? "";
  const emailFromQuery = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resending, setResending] = useState(false);

  const handleLinkVerification = useCallback(
    async (t: string) => {
      setStatus("loading");
      setError("");
      try {
        const msg = await verifyEmail(t);
        setMessage(msg);
        setStatus("success");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
        setStatus("error");
      }
    },
    [verifyEmail],
  );

  useEffect(() => {
    if (token) {
      handleLinkVerification(token);
    }
  }, [token, handleLinkVerification]);

  useEffect(() => {
    if (status === "success" && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [status, isAuthenticated, router]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter the email address you registered with.");
      return;
    }
    if (code.trim().length < 4) {
      setError("Please enter the verification code from your email.");
      return;
    }

    setStatus("loading");
    try {
      const msg = await verifyEmailByCode(email.trim(), code.trim());
      setMessage(msg);
      setStatus("success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.");
      setStatus("error");
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError("Enter your email address to resend the verification email.");
      return;
    }
    setResending(true);
    setInfo("");
    try {
      const msg = await resendVerification(email.trim());
      setInfo(msg);
    } catch (err: unknown) {
      setInfo(err instanceof Error ? err.message : "Could not resend the verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 800,
          background: "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="card animate-fade-in"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "40px 36px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius-lg)",
              background: "var(--accent-orange-bg)",
              border: "1px solid var(--accent-orange-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Atom size={26} style={{ color: "var(--accent-orange)" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--text-primary)" }}>
            Verify your email
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Activate your MatPilot account
          </p>
        </div>

        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <span
              className="spin"
              style={{
                width: 22,
                height: 22,
                border: "2px solid var(--surface-3)",
                borderTopColor: "var(--accent-orange)",
                borderRadius: "50%",
                display: "inline-block",
              }}
            />
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-secondary)" }}>
              Verifying your email...
            </div>
          </div>
        )}

        {status === "success" && (
          <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--accent-emerald-bg)",
                border: "1px solid rgba(16,185,129,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <MailCheck size={26} style={{ color: "var(--accent-emerald)" }} />
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)" }}>{message}</p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", marginTop: 8 }}>
              Your account is now active. You can sign in and start analyzing your materials.
            </p>
            <Link
              href="/login"
              className="button primary lg"
              style={{
                width: "100%",
                justifyContent: "center",
                height: 42,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
                marginTop: 20,
              }}
            >
              <LogIn size={16} />
              Sign in
            </Link>
          </div>
        )}

        {status !== "success" && (
          <>
            {(error || info) && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                  marginBottom: 16,
                  border: "1px solid",
                  ...(error
                    ? { background: "var(--error-bg)", color: "var(--error)", borderColor: "rgba(244,63,94,0.2)" }
                    : { background: "var(--accent-emerald-bg)", color: "var(--accent-emerald)", borderColor: "rgba(16,185,129,0.2)" }),
                }}
              >
                {error || info}
              </div>
            )}

            {status === "error" && (
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => handleResend()}
                  disabled={resending}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--accent-orange)",
                    fontWeight: 500,
                    fontSize: 13,
                  }}
                >
                  <RefreshCw size={13} />
                  {resending ? "Sending..." : "Resend verification email"}
                </button>
              </div>
            )}

            <form onSubmit={handleCodeSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!emailFromQuery}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Verification code *
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter the 6-digit code from your email"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    autoComplete="one-time-code"
                    style={{ paddingRight: 40 }}
                  />
                  <KeyRound size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none" }} />
                </div>
              </div>

              <button
                type="submit"
                className="button primary lg"
                disabled={status === "loading"}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  height: 42,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {status === "loading" ? (
                  <span className="spin" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
                ) : (
                  <>
                    <KeyRound size={16} />
                    Verify email
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button
                type="button"
                onClick={() => handleResend()}
                disabled={resending}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  fontWeight: 500,
                  fontSize: 13,
                  textDecoration: "underline",
                }}
              >
                {resending ? "Sending..." : "Didn't get an email? Resend"}
              </button>
            </div>

            <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "var(--text-tertiary)" }}>
              Already verified?{" "}
              <Link href="/login" style={{ color: "var(--accent-orange)", fontWeight: 500, textDecoration: "none" }}>
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyWorkspace />
    </Suspense>
  );
}
