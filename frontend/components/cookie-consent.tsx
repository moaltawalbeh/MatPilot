"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X, Check, ShieldCheck, Settings, AlertCircle } from "lucide-react";

export interface CookieConsentPreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  timestamp: string;
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState<CookieConsentPreferences>({
    essential: true,
    functional: true,
    analytics: true,
    timestamp: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("matpilot_cookie_consent");
    if (!saved) {
      // First visit: show bottom banner
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(parsed);
      } catch {
        setShowBanner(true);
      }
    }

    // Event listener to allow reopening cookie settings from any page / footer
    const handleOpenSettings = () => {
      setShowModal(true);
      setShowBanner(false);
    };

    window.addEventListener("matpilot:openCookieSettings", handleOpenSettings);
    return () => {
      window.removeEventListener("matpilot:openCookieSettings", handleOpenSettings);
    };
  }, []);

  const saveConsent = (prefs: CookieConsentPreferences) => {
    const updated = {
      ...prefs,
      essential: true, // always required
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("matpilot_cookie_consent", JSON.stringify(updated));
    setPreferences(updated);
    setShowBanner(false);
    setShowModal(false);
  };

  const acceptAll = () => {
    saveConsent({
      essential: true,
      functional: true,
      analytics: true,
      timestamp: new Date().toISOString(),
    });
  };

  const rejectNonEssential = () => {
    saveConsent({
      essential: true,
      functional: false,
      analytics: false,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <>
      {/* Bottom Banner */}
      {showBanner && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 40px)",
            maxWidth: 850,
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
            borderRadius: 16,
            padding: "20px 24px",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1, minWidth: 280 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--accent-orange-bg)",
                color: "var(--accent-orange)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Cookie size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                GDPR & ePrivacy Cookie Consent
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                We use cookies to secure user sessions, remember UI preferences, and monitor platform performance. Read our{" "}
                <Link href="/cookie-policy" style={{ color: "var(--accent-orange)", textDecoration: "underline" }}>
                  Cookie Policy
                </Link>{" "}
                for full transparency.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Manage Preferences
            </button>
            <button
              onClick={rejectNonEssential}
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reject Non-Essential
            </button>
            <button
              onClick={acceptAll}
              style={{
                background: "var(--accent-orange)",
                border: "none",
                color: "white",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(249, 115, 22, 0.25)",
              }}
            >
              Accept All
            </button>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 100000,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 550,
              background: "var(--surface-1)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 16,
              boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Settings size={18} style={{ color: "var(--accent-orange)" }} />
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
                  Cookie Preference Center
                </span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16, maxHeight: 420, overflowY: "auto" }}>
              {/* Essential */}
              <div style={{ padding: 14, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>
                    Strictly Essential Cookies
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--accent-green)",
                      background: "var(--accent-green-bg)",
                      padding: "2px 8px",
                      borderRadius: 12,
                    }}
                  >
                    Always Enabled
                  </span>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0 }}>
                  Required for JWT authentication, CSRF protection, and GDPR consent retention. Cannot be turned off.
                </p>
              </div>

              {/* Functional */}
              <div style={{ padding: 14, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>
                    Functional & UI Preferences
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0 }}>
                  Remembers your dark/light theme selection, language locale, and recent workspace layout settings.
                </p>
              </div>

              {/* Analytics */}
              <div style={{ padding: 14, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>
                    Anonymized Performance & Telemetry
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0 }}>
                  Helps us diagnose UI latency and monitor scientific tool error rates. Never used for marketing or ad tracking.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border-subtle)",
                background: "var(--surface-2)",
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <button
                onClick={rejectNonEssential}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reject Non-Essential
              </button>
              <button
                onClick={() => saveConsent(preferences)}
                style={{
                  background: "var(--accent-orange)",
                  border: "none",
                  color: "white",
                  padding: "8px 18px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
