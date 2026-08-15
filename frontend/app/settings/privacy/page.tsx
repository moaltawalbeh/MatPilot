"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function UserSettingsPrivacyPage() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleExportData = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/v1/legal/export-data", { method: "POST" });
      if (!response.ok) throw new Error("Failed to export user data");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "matpilot_user_data_export.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMessage("Data export downloaded successfully.");
    } catch (err: any) {
      setMessage(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== "DELETE MY ACCOUNT") {
      alert("Please type 'DELETE MY ACCOUNT' to confirm deletion.");
      return;
    }

    if (!confirm("ARE YOU ABSOLUTELY SURE? This will permanently erase your profile, all projects, and uploaded CIF/XRD datasets!")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch("/api/v1/legal/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Account deletion failed");

      alert(data.message);
      window.location.href = "/";
    } catch (err: any) {
      alert(`Deletion Error: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-matDark text-white selection:bg-matOrange selection:text-black">
      {/* Settings Navigation Header */}
      <nav className="border-b border-matBorder py-4 px-6 lg:px-12 flex justify-between items-center bg-matDark/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="w-8 h-8 rounded-xl bg-matOrange flex items-center justify-center text-white font-bold font-sans text-lg shadow-md shadow-matOrange/30">
            M
          </Link>
          <span className="font-bold text-lg tracking-tight text-white font-sans">Settings // Data & Privacy</span>
        </div>
        <Link href="/dashboard" className="text-xs text-matTextMuted hover:text-white font-mono">
          Back to Dashboard
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto py-12 px-6 lg:px-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-matOrange/30 bg-matOrange/10 text-matOrange text-xs font-mono mb-3">
            GDPR ARTICLE 15 & 20 COMPLIANCE
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">Data Management & Privacy Rights</h1>
          <p className="text-xs text-matTextMuted font-mono mt-1">
            Complete transparency into your stored scientific workspace, data portability, and account deletion options.
          </p>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-matOrange/10 border border-matOrange/30 text-matOrange text-xs font-mono">
            {message}
          </div>
        )}

        <div className="space-y-8">
          {/* Section 1: What Data We Store */}
          <div className="p-6 rounded-2xl bg-matSurface border border-matBorder space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <i className="fas fa-database text-matOrange"></i> 1. Stored Workspace Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-matElevated/80 border border-matBorder">
                <span className="text-matTextDim text-[10px] block uppercase">User Profile</span>
                <span className="text-white font-bold block mt-1">Encrypted Credentials & Email</span>
              </div>
              <div className="p-3.5 rounded-xl bg-matElevated/80 border border-matBorder">
                <span className="text-matTextDim text-[10px] block uppercase">Diffraction Patterns</span>
                <span className="text-matOrange font-bold block mt-1">Raw 2&theta; Scans & CIF Files</span>
              </div>
              <div className="p-3.5 rounded-xl bg-matElevated/80 border border-matBorder">
                <span className="text-matTextDim text-[10px] block uppercase">Refinement Outputs</span>
                <span className="text-matBlue font-bold block mt-1">R_wp, Peaks, W-H Plots</span>
              </div>
            </div>
          </div>

          {/* Section 2: Download My Data (Portability) */}
          <div className="p-6 rounded-2xl bg-matSurface border border-matBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className="fas fa-download text-matBlue"></i> 2. Export All My Data (GDPR Data Portability)
              </h3>
              <p className="text-xs text-matTextMuted mt-1 max-w-xl">
                Download a complete ZIP package containing your user profile, all projects, experiment datasets, peak tables, and reports.
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="px-5 py-2.5 rounded-xl bg-matBlue hover:bg-blue-600 text-white font-bold text-xs font-mono transition-all shrink-0 flex items-center gap-2 disabled:opacity-50"
            >
              <i className="fas fa-file-archive"></i>
              {exporting ? "Compiling ZIP..." : "Download My Data"}
            </button>
          </div>

          {/* Section 3: Erase Account & Workspace (Right to be Forgotten) */}
          <div className="p-6 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-4">
            <div>
              <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                <i className="fas fa-trash-alt"></i> 3. Permanent Account & Workspace Deletion (Right to be Forgotten)
              </h3>
              <p className="text-xs text-matTextMuted mt-1">
                Permanently erase your account credentials, all projects, experiment history, and uploaded CIF datasets. This action cannot be undone.
              </p>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-3 pt-2">
              <label className="block text-xs font-mono text-matTextMuted">
                Type <strong className="text-red-400 font-mono">DELETE MY ACCOUNT</strong> to confirm:
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="px-4 py-2.5 rounded-lg bg-matDark border border-red-900/50 text-white text-xs font-mono focus:outline-none focus:border-red-500 flex-1"
                />
                <button
                  type="submit"
                  disabled={deleting || deleteConfirmation !== "DELETE MY ACCOUNT"}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs font-mono transition-all disabled:opacity-40 shrink-0"
                >
                  {deleting ? "Erasing Data..." : "Permanently Delete Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
