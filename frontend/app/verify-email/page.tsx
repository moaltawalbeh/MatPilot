"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail, Atom } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyEmail, resendVerification } = useAuth();

  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"verifying" | "success" | "error" | "missing_token">(
    token ? "verifying" : "missing_token"
  );
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("missing_token");
      return;
    }

    let isMounted = true;

    async function doVerify() {
      try {
        const res = await verifyEmail(token);
        if (isMounted) {
          setStatus("success");
          setMessage(res || "Email verified successfully");
        }
      } catch (err: unknown) {
        if (isMounted) {
          setStatus("error");
          const errorText = err instanceof Error ? err.message : "Verification link is invalid or has expired.";
          setMessage(errorText);
        }
      }
    }

    doVerify();

    return () => {
      isMounted = false;
    };
  }, [token, verifyEmail]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendStatus("sending");
    setResendMsg("");
    try {
      const res = await resendVerification(resendEmail.trim());
      setResendStatus("sent");
      setResendMsg(res || "If the account exists, a verification email has been sent.");
    } catch (err: unknown) {
      setResendStatus("error");
      const errorText = err instanceof Error ? err.message : "Failed to resend verification email.";
      setResendMsg(errorText);
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
        padding: 24,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "-30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 800,
          background: "radial-gradient(circle, rgba(56,139,253,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="card animate-fade-in"
        style={{
          width: "100%",
          maxWidth: 460,
          padding: "44px 38px",
          position: "relative",
          zIndex: 1,
          textAlign: "center",
        }}
      >
        {/* Logo badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--radius-lg)",
              background: "rgba(56,139,253,0.12)",
              border: "1px solid rgba(56,139,253,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Atom size={28} style={{ color: "#58a6ff" }} />
          </div>
        </div>

        {status === "verifying" && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <Loader2 className="animate-spin" size={40} style={{ color: "#58a6ff" }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              Verifying Email Address
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
              Please wait while we validate your security verification token...
            </p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <CheckCircle2 size={48} style={{ color: "var(--accent-green, #3fb950)" }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              Email Verified Successfully
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              {message || "Your email address has been verified. Your MatPilot cloud scientific workspace is fully enabled."}
            </p>
            <Link
              href="/dashboard"
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "12px 20px",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              <span>Go to Dashboard</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        )}

        {(status === "error" || status === "missing_token") && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <AlertCircle size={48} style={{ color: "var(--accent-red, #f85149)" }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              {status === "missing_token" ? "Verification Token Required" : "Verification Failed"}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              {status === "missing_token"
                ? "No verification token was found in the URL. Please use the link sent to your email address."
                : message || "The verification token is invalid or has expired."}
            </p>

            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: 20,
                textAlign: "left",
                marginBottom: 24,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
                Request a New Verification Link
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                Enter your account email address and we will send a new verification email.
              </p>
              <form onSubmit={handleResend} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={18}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    type="email"
                    placeholder="name@university.edu"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 38px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={resendStatus === "sending"}
                  className="btn btn-secondary"
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {resendStatus === "sending" ? "Sending..." : "Resend Verification Email"}
                </button>
              </form>

              {resendMsg && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: resendStatus === "sent" ? "var(--accent-green, #3fb950)" : "var(--accent-red, #f85149)",
                  }}
                >
                  {resendMsg}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 14 }}>
              <Link href="/login" style={{ color: "#58a6ff", textDecoration: "none" }}>
                Back to Login
              </Link>
              <span style={{ color: "var(--text-muted)" }}>&bull;</span>
              <Link href="/contact" style={{ color: "#58a6ff", textDecoration: "none" }}>
                Contact Laboratory Support
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 className="animate-spin" size={32} style={{ color: "#58a6ff" }} />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
