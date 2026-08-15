"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: true,
    performance: true,
    functional: true,
    marketing: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("matpilot_cookie_preferences");
    if (!saved) {
      setShowBanner(true);
    } else {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleAcceptAll = () => {
    const allOn = {
      necessary: true,
      analytics: true,
      performance: true,
      functional: true,
      marketing: true,
    };
    savePreferences(allOn);
  };

  const handleRejectOptional = () => {
    const essentialOnly = {
      necessary: true,
      analytics: false,
      performance: false,
      functional: false,
      marketing: false,
    };
    savePreferences(essentialOnly);
  };

  const savePreferences = (prefs: typeof preferences) => {
    setPreferences(prefs);
    localStorage.setItem("matpilot_cookie_preferences", JSON.stringify(prefs));
    setShowBanner(false);
    setShowModal(false);

    try {
      fetch("/api/v1/legal/cookie-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
    } catch (e) {}
  };

  if (!showBanner && !showModal) return null;

  return (
    <>
      {/* Non-intrusive Floating Cookie Consent Banner */}
      {showBanner && !showModal && (
        <div className="fixed bottom-5 left-5 right-5 md:left-auto md:right-5 md:max-w-md z-50 p-5 rounded-2xl bg-matElevated/95 border border-matBorder shadow-2xl backdrop-blur-xl text-white animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-matOrange/10 border border-matOrange/30 flex items-center justify-center text-matOrange shrink-0 mt-0.5">
              <i className="fas fa-cookie-bite text-base"></i>
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-tight text-white">We Value Your Data & Privacy</h4>
              <p className="text-xs text-matTextMuted mt-1 leading-relaxed">
                MatPilot uses cookies to ensure security, scientific performance, and analytics. We never sell research data. Learn more in our{" "}
                <Link href="/privacy" className="text-matOrange underline hover:text-matOrangeLight">
                  Privacy Center
                </Link>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-matBorder">
            <button
              onClick={handleAcceptAll}
              className="flex-1 py-2 px-3 rounded-lg bg-matOrange hover:bg-matOrangeLight text-matDark font-bold text-xs transition-all shadow-md shadow-matOrange/20"
            >
              Accept All
            </button>
            <button
              onClick={handleRejectOptional}
              className="flex-1 py-2 px-3 rounded-lg bg-matSurface hover:bg-matElevated border border-matBorder text-matTextMuted hover:text-white text-xs font-medium transition-all"
            >
              Reject Optional
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="py-2 px-3 rounded-lg bg-transparent hover:bg-matSurface text-matTextDim hover:text-white text-xs font-mono transition-all"
            >
              Customize
            </button>
          </div>
        </div>
      )}

      {/* Detailed Cookie Preferences Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-matSurface border border-matBorder p-6 md:p-8 shadow-2xl text-white relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-matTextDim hover:text-white text-base"
            >
              <i className="fas fa-times"></i>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-matOrange/10 border border-matOrange/30 flex items-center justify-center text-matOrange">
                <i className="fas fa-sliders-h text-lg"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Cookie Consent Preferences</h3>
                <p className="text-xs text-matTextMuted font-mono">GDPR & Academic Research Privacy Control</p>
              </div>
            </div>

            <div className="space-y-4 my-6 max-h-72 overflow-y-auto pr-2">
              {/* Category: Necessary */}
              <div className="p-3.5 rounded-xl bg-matElevated/60 border border-matBorder flex justify-between items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Strictly Necessary</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      ALWAYS ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-matTextMuted mt-1">
                    Essential for secure authentication, session persistence, and core scientific computing.
                  </p>
                </div>
                <input type="checkbox" checked disabled className="w-4 h-4 accent-matOrange rounded" />
              </div>

              {/* Category: Analytics */}
              <div className="p-3.5 rounded-xl bg-matElevated/60 border border-matBorder flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-white">Scientific Analytics</span>
                  <p className="text-[11px] text-matTextMuted mt-1">
                    Anonymous telemetry helping us optimize Rietveld refinement algorithms and compute speeds.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="w-4 h-4 accent-matOrange rounded cursor-pointer"
                />
              </div>

              {/* Category: Performance */}
              <div className="p-3.5 rounded-xl bg-matElevated/60 border border-matBorder flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-white">Performance & Cache</span>
                  <p className="text-[11px] text-matTextMuted mt-1">
                    Caches WebGL 3D crystal lattices and PDF report render states for faster loading.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.performance}
                  onChange={(e) => setPreferences({ ...preferences, performance: e.target.checked })}
                  className="w-4 h-4 accent-matOrange rounded cursor-pointer"
                />
              </div>

              {/* Category: Functional */}
              <div className="p-3.5 rounded-xl bg-matElevated/60 border border-matBorder flex justify-between items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-white">Functional Customization</span>
                  <p className="text-[11px] text-matTextMuted mt-1">
                    Remembers your preferred UI layout, spectral units ($2\theta$, d-spacing), and audio synth volume.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.functional}
                  onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                  className="w-4 h-4 accent-matOrange rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-matBorder">
              <button
                onClick={() => savePreferences(preferences)}
                className="flex-1 py-2.5 rounded-lg bg-matOrange hover:bg-matOrangeLight text-matDark font-bold text-xs transition-all shadow-md shadow-matOrange/20"
              >
                Save Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="py-2.5 px-4 rounded-lg bg-matElevated hover:bg-matSurface border border-matBorder text-white text-xs font-semibold transition-all"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
