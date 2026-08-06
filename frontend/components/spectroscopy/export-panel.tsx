"use client";

import { Download, FileText, FileDown } from "lucide-react";
import { useDownloadSpectrum } from "../../hooks/use-api";
import type { SpectroscopyTechnique } from "../../types";

type ExportPanelProps = {
  technique: SpectroscopyTechnique;
  spectrumId: string;
  filename?: string;
};

export function ExportPanel({ technique, spectrumId, filename }: ExportPanelProps) {
  const download = useDownloadSpectrum(technique);

  const run = async (format: "txt" | "csv") => {
    try {
      await download.mutateAsync({ id: spectrumId, format });
    } catch {
      // error surfaced via download.error below
    }
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="section" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Download size={14} style={{ color: "var(--accent-orange)" }} />
        <div>
          <h2>Export</h2>
          <span className="muted">Download processed data</span>
        </div>
      </div>
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="button" onClick={() => run("txt")} disabled={download.isPending} style={{ justifyContent: "flex-start" }}>
            <FileText size={14} />
            Text (.txt)
          </button>
          <button className="button" onClick={() => run("csv")} disabled={download.isPending} style={{ justifyContent: "flex-start" }}>
            <FileDown size={14} />
            CSV (.csv)
          </button>
        </div>
        {download.error && (
          <p style={{ fontSize: 11, color: "var(--error)", lineHeight: 1.5 }}>
            {(download.error as Error)?.message ?? "Export failed. Please try again."}
          </p>
        )}
        {download.isSuccess && (
          <p style={{ fontSize: 11, color: "var(--success)", lineHeight: 1.5 }}>
            {filename ? `${filename.replace(/\.\w+$/, "")}` : "Spectrum"} downloaded.
          </p>
        )}
      </div>
    </div>
  );
}
