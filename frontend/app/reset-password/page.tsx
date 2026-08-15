"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, AlertCircle, Loader2, Lock, Eye, EyeOff, KeyRound, Atom } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPassword } = useAuth();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!token) {
      setErrorMsg("Missing password reset token in URL.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    try {
      await resetPassword(token, password);
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      const errorText = err instanceof Error ? err.message : "Failed to reset password. The token may be expired.";
      setErrorMsg(errorText);
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
          background: "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="card animate-fade-in"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "44px 38px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "var(--radius-lg)",
              background: "rgba(249,115,22,0.12)",
              border: "1px solid rgba(249,115,22,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <KeyRound size={28} style={{ color: "var(--accent-orange, #f97316)" }} />
          </div>
        </div>

        {status === "success" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <CheckCircle2 size={48} style={{ color: "var(--accent-green, #3fb950)" }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
              Password Reset Successful
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Your password has been updated and all previous sessions have been securely terminated.
            </p>
            <Link
              href="/login"
              className="btn btn-primary"
              style={{
                display: "inline-block",
                width: "100%",
                padding: "12px 20px",
                fontSize: 15,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              Sign In to Your Workspace
            </Link>
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", textAlign: "center", marginBottom: 8 }}>
              Set New Password
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, textAlign: "center", marginBottom: 28 }}>
              Choose a strong, unique password for your MatPilot scientific workspace account.
            </p>

            {errorMsg && (
              <div
                style={{
                  background: "rgba(248,81,73,0.1)",
                  border: "1px solid rgba(248,81,73,0.3)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 16px",
                  color: "#f85149",
                  fontSize: 13,
                  marginBottom: 20,
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
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
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 40px 10px 38px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
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
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  fontSize: 15,
                  fontWeight: 600,
                  marginTop: 8,
                }}
              >
                {status === "submitting" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Updating Password...</span>
                  </span>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: 14 }}>
              <Link href="/login" style={{ color: "#58a6ff", textDecoration: "none" }}>
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 className="animate-spin" size={32} style={{ color: "#58a6ff" }} />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
