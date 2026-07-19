"use client";

import { use } from "react";
import { PublicHeader, PublicFooter } from "@/components/layout/public-header";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Search, Target, Database, FileText, Atom, Sparkles, CheckCircle2, Upload, Settings, Download } from "lucide-react";

const serviceData: Record<string, {
  title: string;
  icon: typeof BarChart3;
  overview: string;
  scientificBackground: string;
  workflow: string[];
  inputFormats: string[];
  outputs: string[];
  benefits: string[];
  faqs: { q: string; a: string }[];
}> = {
  "xrd-analysis": {
    title: "XRD Pattern Analysis",
    icon: BarChart3,
    overview: "MatPilot provides a complete pipeline for analyzing powder X-ray diffraction patterns. The automated workflow processes raw detector data through background subtraction, Kα2 radiation stripping, and noise reduction to produce clean diffraction patterns ready for peak detection and phase identification.",
    scientificBackground: "X-ray diffraction (XRD) is the primary technique for characterizing crystalline materials. When a monochromatic X-ray beam strikes a polycrystalline sample, the diffracted intensity as a function of 2θ angle reveals the crystal structure through Bragg's Law: nλ = 2d·sin(θ). The measured pattern contains contributions from the sample's crystal structure, instrumental broadening, and experimental noise that must be separated for accurate analysis.",
    workflow: [
      "Upload your XRD data file (XRDML, RAW, XY, CSV, or other formats)",
      "Automatic format detection and parsing extracts 2θ and intensity arrays",
      "Background correction removes the diffuse scattering component using iterative polynomial fitting",
      "Kα2 stripping eliminates the Kα2 wavelength contribution using the Rachinger algorithm",
      "Noise reduction smooths the pattern while preserving peak shapes using Savitzky-Golay filtering",
      "Peak detection identifies Bragg peaks using second-derivative methods with adaptive thresholds",
    ],
    inputFormats: ["Bruker RAW", "PANalytical XRDML", "XY (two-column)", "CSV", "DAT", "TXT"],
    outputs: [
      "Background-corrected diffraction pattern",
      "Kα2-stripped intensity data",
      "Smoothed pattern with preserved peak profiles",
      "Detected peak positions (2θ), intensities, FWHM, and d-spacings",
      "Interactive diffraction pattern chart",
    ],
    benefits: [
      "Automated processing eliminates manual intervention",
      "Multiple format support for universal compatibility",
      "Publication-quality output suitable for journal submission",
      "Interactive chart with zoom, pan, and high-resolution export",
      "Reproducible results with documented processing parameters",
    ],
    faqs: [
      { q: "What file formats are supported?", a: "MatPilot supports Bruker RAW (binary and text), PANalytical XRDML, XY two-column, CSV, DAT, and TXT formats. The parser automatically detects the format upon upload." },
      { q: "How does background correction work?", a: "The algorithm uses an iterative polynomial fitting approach that progressively identifies and excludes peak regions, fitting the background to the remaining points until convergence is achieved." },
      { q: "Can I adjust processing parameters?", a: "Yes, the pipeline allows customization of background polynomial degree, Kα2 stripping parameters, noise reduction window size, and peak detection sensitivity thresholds." },
    ],
  },
  "phase-identification": {
    title: "Phase Identification",
    icon: Search,
    overview: "Automatically match your experimental diffraction pattern against crystallographic reference databases. MatPilot searches both the Crystallography Open Database (COD) API and a curated local database to identify crystalline phases present in your sample.",
    scientificBackground: "Phase identification in XRD relies on matching the observed peak positions and relative intensities against reference patterns from known crystalline materials. Each crystal structure produces a unique diffraction fingerprint determined by its unit cell dimensions, space group, and atomic positions. MatPilot uses multiple similarity metrics including cosine similarity, figure of merit (FOM), and RMSE of peak positions to rank candidate phases.",
    workflow: [
      "Run the analysis pipeline to detect peaks from your experimental pattern",
      "Configure search parameters: query text, element constraints, database selection",
      "Search the COD API for formula or element matches across 500,000+ structures",
      "Query the local reference database for common materials",
      "Generate theoretical diffraction patterns from CIF crystal data using pymatgen",
      "Compare theoretical patterns against experimental data using cosine similarity",
      "Rank candidates by match score, confidence, and number of matched peaks",
    ],
    inputFormats: ["Detected peaks from pipeline", "Manual peak lists", "Element or formula queries"],
    outputs: [
      "Ranked list of candidate phases with match scores",
      "Confidence levels (High / Medium / Low)",
      "Matched peak count and peak fraction statistics",
      "CIF files for top candidates",
      "Theoretical diffraction patterns overlaid on experimental data",
    ],
    benefits: [
      "Searches both online COD and local offline database simultaneously",
      "Automatic theoretical pattern generation from crystal data",
      "Multiple similarity metrics provide robust matching",
      "Confidence scoring helps prioritize candidate selection",
      "CIF download for downstream Rietveld refinement",
    ],
    faqs: [
      { q: "What databases does MatPilot search?", a: "MatPilot searches the Crystallography Open Database (COD) via its REST API, and a local curated database of 50+ common crystalline materials. The local database serves as an offline fallback when the COD API is unreachable." },
      { q: "How accurate is phase identification?", a: "Accuracy depends on pattern quality, preferred orientation effects, and database coverage. MatPilot uses multiple scoring metrics and reports confidence levels to help assess reliability." },
      { q: "Can I upload my own reference patterns?", a: "Yes, you can upload CIF files directly to an experiment. These are parsed and used alongside database results for phase identification." },
    ],
  },
  "rietveld-refinement": {
    title: "Rietveld Refinement",
    icon: Target,
    overview: "Perform whole-pattern least-squares Rietveld refinement to extract quantitative structural and microstructural parameters from multiphase powder diffraction data.",
    scientificBackground: "Rietveld refinement simultaneously fits all parameters of a structural model to the entire measured diffraction pattern. The refinement minimizes the difference between observed and calculated profiles by adjusting scale factors, lattice parameters, profile shape coefficients (Caglioti U, V, W), zero-shift, background polynomial, and site occupancies. Quality is assessed through R_wp, R_p, R_exp, and the goodness-of-fit (GoF) ratio.",
    workflow: [
      "Complete the analysis pipeline through peak detection and phase identification",
      "Select candidate phases identified during phase identification",
      "Choose refinement workflow (auto or manual CIF upload)",
      "Run Rietveld refinement with profile shape modeling (Pseudo-Voigt)",
      "Review fit quality metrics (R_wp, R_p, R_exp, χ², GoF)",
      "Export refined parameters, phase fractions, and calculated patterns",
    ],
    inputFormats: ["Phase identification results", "Uploaded CIF files", "Selected refinement phases"],
    outputs: [
      "Refined lattice parameters for each phase",
      "Phase weight fractions",
      "Profile shape parameters (U, V, W)",
      "Zero-shift correction",
      "Observed, calculated, and difference patterns",
      "R_wp, R_p, R_exp, χ², GoF quality indicators",
    ],
    benefits: [
      "Automated workflow reduces expert intervention",
      "Multiple refinement strategies for different sample types",
      "Publication-quality Rietveld plots with observed, calculated, and difference curves",
      "Quantitative phase analysis with uncertainty estimates",
      "Complete parameter documentation for reproducibility",
    ],
    faqs: [
      { q: "What refinement parameters are optimized?", a: "Scale factors, lattice parameters, profile shape parameters (Caglioti U, V, W), zero-shift, and background polynomial coefficients are refined. Site occupancies and thermal parameters can be included for supported structures." },
      { q: "How do I assess refinement quality?", a: "MatPilot reports R_wp (weighted profile R-factor), R_p (profile R-factor), R_exp (expected R-factor), χ² (reduced chi-squared), and GoF (goodness of fit). GoF values near 1.0 indicate a good fit." },
      { q: "Can I refine multiple phases simultaneously?", a: "Yes, the multiphase Rietveld refinement handles N-phase mixtures, refining scale factors (and thus weight fractions) for each phase along with shared and phase-specific parameters." },
    ],
  },
  "reference-search": {
    title: "Reference Database Search",
    icon: Database,
    overview: "Access the Crystallography Open Database and a curated local reference library for crystallographic data. Search by chemical formula, elements, or space group to find matching crystal structures.",
    scientificBackground: "Crystallographic reference databases contain validated crystal structure data including unit cell dimensions, space groups, atomic positions, and computed diffraction properties. The COD provides over 500,000 peer-reviewed crystal structures. The local database supplements this with 50+ commonly referenced materials including LaB6 (JCPDS 34-0421), Si, Al₂O₃, TiO₂, and other standards used in routine XRD analysis.",
    workflow: [
      "Navigate to the database search from the project workspace",
      "Enter a chemical formula (e.g., LaB6) or element list (e.g., La, B)",
      "MatPilot queries both the COD API and local database in parallel",
      "Results include crystal structure data, diffraction peak lists, and CIF references",
      "Download CIF files for further analysis or Rietveld refinement",
    ],
    inputFormats: ["Chemical formula", "Element list", "Space group"],
    outputs: [
      "Matching crystal structures with metadata",
      "Diffraction peak lists (2θ, intensity, hkl, d-spacing)",
      "Downloadable CIF files",
      "Theoretical diffraction patterns generated from crystal data",
      "Database source attribution and citation information",
    ],
    benefits: [
      "Dual-database search maximizes coverage",
      "Local database provides offline reliability",
      "Automatic theoretical pattern generation saves analysis time",
      "CIF caching reduces redundant API calls",
      "Peer-reviewed crystal structures ensure data quality",
    ],
    faqs: [
      { q: "Is the COD search free?", a: "Yes, the Crystallography Open Database is free and open-access. MatPilot queries it via the COD REST API." },
      { q: "What if the COD API is unreachable?", a: "MatPilot automatically falls back to the local reference database, which contains 50+ common crystalline materials with complete diffraction data." },
    ],
  },
  "cif-processing": {
    title: "CIF Processing",
    icon: FileText,
    overview: "Upload, parse, and validate Crystallographic Information Files (CIF) to extract crystal structure data including unit cell parameters, space groups, and atomic positions.",
    scientificBackground: "The CIF format is the IUCr standard for crystallographic data exchange. A CIF file contains the complete crystal structure description: unit cell dimensions (a, b, c, α, β, γ), space group symmetry, atomic site labels with fractional coordinates, and experimental metadata. MatPilot's CIF parser validates the file format and extracts structured data for visualization and analysis.",
    workflow: [
      "Upload one or more CIF files to an experiment",
      "Automatic format validation and structure parsing",
      "Unit cell parameters extracted and displayed",
      "Space group symbol and number identified",
      "Atomic positions with fractional coordinates parsed",
      "CIF data linked to the experiment for phase identification and refinement",
    ],
    inputFormats: ["CIF (Crystallographic Information File)"],
    outputs: [
      "Parsed unit cell parameters (a, b, c, α, β, γ)",
      "Space group symbol and number",
      "Atomic positions with element, label, and fractional coordinates",
      "Crystal system identification",
      "CIF metadata summary",
    ],
    benefits: [
      "Automatic validation catches format errors early",
      "Structured data extraction enables downstream analysis",
      "Multiple CIF files supported per experiment",
      "Parsed data feeds directly into Rietveld refinement",
      "Standard CIF format ensures broad compatibility",
    ],
    faqs: [
      { q: "What CIF versions are supported?", a: "MatPilot supports standard CIF 1.1 and CIF 2.0 formats as defined by the International Union of Crystallography (IUCr)." },
      { q: "Can I edit CIF data after upload?", a: "Uploaded CIF files are parsed as-is. To modify crystal data, edit the CIF file and re-upload." },
    ],
  },
  "crystal-visualization": {
    title: "Crystal Structure Visualization",
    icon: Atom,
    overview: "Visualize crystal structures in interactive 3D, displaying unit cell geometry, atomic positions, and space group information derived from CIF data.",
    scientificBackground: "Crystal structure visualization provides essential insight into the atomic arrangement of crystalline materials. The unit cell defines the repeating motif through lattice parameters and symmetry operations. Understanding the spatial distribution of atoms, their coordination environments, and the symmetry of the structure is fundamental to interpreting diffraction data and understanding structure-property relationships.",
    workflow: [
      "Upload CIF files or run phase identification to obtain crystal structure data",
      "The crystal viewer automatically renders the unit cell and atomic positions",
      "Interact with the 3D model: rotate, zoom, and pan",
      "View unit cell parameters, space group, and atomic coordinates",
      "Toggle atom labels and connectivity visualization",
    ],
    inputFormats: ["Parsed CIF data", "Phase identification results"],
    outputs: [
      "Interactive 3D crystal structure visualization",
      "Unit cell parameter display (a, b, c, α, β, γ)",
      "Space group symbol and crystal system",
      "Atomic position table with fractional coordinates",
    ],
    benefits: [
      "Immediate visual feedback on crystal structure",
      "Interactive 3D navigation for detailed inspection",
      "Seamless integration with CIF upload and phase identification",
      "Publication-ready structure representations",
    ],
    faqs: [
      { q: "What 3D technology is used?", a: "MatPilot uses WebGL-based 3D rendering for crystal structure visualization, compatible with all modern browsers." },
      { q: "Can I export crystal structure images?", a: "Yes, the crystal viewer supports PNG export of the current 3D view for use in publications and presentations." },
    ],
  },
  "report-generation": {
    title: "Scientific Report Generation",
    icon: Sparkles,
    overview: "Generate comprehensive, publication-quality PDF reports that document your complete XRD analysis workflow, results, and conclusions with embedded figures and data tables.",
    scientificBackground: "A scientific report provides the permanent record of an analysis. For XRD studies, this includes the experimental conditions (radiation source, wavelength, scan range), data processing steps, phase identification results with match scores, and Rietveld refinement parameters with quality indicators. MatPilot's report generator produces formatted documents suitable for journal submission, laboratory records, or thesis chapters.",
    workflow: [
      "Complete your analysis: upload, process, identify phases, refine",
      "Navigate to the Reports section or use the experiment export",
      "Select PDF Report as the export format",
      "MatPilot generates the report with all analysis data",
      "Download the publication-quality PDF with figures and tables",
    ],
    inputFormats: ["Complete analysis results", "Experiment data", "Pipeline outputs"],
    outputs: [
      "Formatted PDF report with cover page and table of contents",
      "Experimental diffraction pattern figure (matplotlib)",
      "Background-corrected pattern figure",
      "Rietveld overlay figure (observed, calculated, difference)",
      "Phase identification results table",
      "Detected peaks table with d-spacings and FWHM",
      "Rietveld refinement parameters and quality metrics",
      "Methodology description section",
    ],
    benefits: [
      "One-click generation saves hours of report writing",
      "Publication-quality figures with scientific formatting",
      "Complete documentation ensures reproducibility",
      "Consistent format across all analyses",
      "Automatic inclusion of all relevant analysis data",
    ],
    faqs: [
      { q: "What format is the report?", a: "Reports are generated as PDF files using ReportLab, with matplotlib figures embedded at publication resolution." },
      { q: "Can I customize the report template?", a: "The current version uses a standardized template. Future versions will support custom templates and branding." },
    ],
  },
};

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const service = serviceData[slug];

  if (!service) {
    notFound();
  }

  const Icon = service.icon;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: 900, margin: "0 auto", padding: "48px 32px", width: "100%" }}>
        {/* Back link */}
        <Link href="/services" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", textDecoration: "none", marginBottom: 24, transition: "color 0.15s" }}>
          <ArrowLeft size={14} /> Back to Services
        </Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "var(--radius-lg)",
            background: "var(--accent-orange-bg)",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <Icon size={24} style={{ color: "var(--accent-orange)" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.3px" }}>{service.title}</h1>
          </div>
        </div>

        {/* Overview */}
        <section className="card" style={{ marginBottom: 20, padding: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 650, marginBottom: 12 }}>Overview</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)" }}>{service.overview}</p>
        </section>

        {/* Scientific Background */}
        <section className="card" style={{ marginBottom: 20, padding: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 650, marginBottom: 12 }}>Scientific Background</h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text-secondary)" }}>{service.scientificBackground}</p>
        </section>

        {/* Workflow */}
        <section className="card" style={{ marginBottom: 20, padding: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 650, marginBottom: 14 }}>Workflow</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {service.workflow.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 14, padding: "10px 0", borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--accent-orange-bg)", color: "var(--accent-orange)",
                  display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700,
                  flexShrink: 0, marginTop: 1,
                }}>{i + 1}</div>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Input / Output */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <section className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Upload size={16} style={{ color: "var(--accent-orange)" }} />
              <h3 style={{ fontSize: 14, fontWeight: 650 }}>Input Formats</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {service.inputFormats.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={12} style={{ color: "var(--accent-emerald)", flexShrink: 0 }} />
                  {f}
                </div>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Download size={16} style={{ color: "var(--accent-orange)" }} />
              <h3 style={{ fontSize: 14, fontWeight: 650 }}>Expected Outputs</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {service.outputs.map((o) => (
                <div key={o} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={12} style={{ color: "var(--accent-cyan)", flexShrink: 0 }} />
                  {o}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Benefits */}
        <section className="card" style={{ marginBottom: 20, padding: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 650, marginBottom: 14 }}>Benefits</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {service.benefits.map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--text-secondary)" }}>
                <CheckCircle2 size={14} style={{ color: "var(--accent-orange)", flexShrink: 0 }} />
                {b}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="card" style={{ marginBottom: 20, padding: 28 }}>
          <h2 style={{ fontSize: 17, fontWeight: 650, marginBottom: 14 }}>Frequently Asked Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {service.faqs.map((faq, i) => (
              <div key={i}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{faq.q}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <Link href="/dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 28px", borderRadius: "var(--radius-md)",
            background: "var(--accent-orange)", color: "white",
            fontSize: 14, fontWeight: 600, textDecoration: "none",
            transition: "all 0.15s",
          }}>
            <Settings size={16} /> Try This Service
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
