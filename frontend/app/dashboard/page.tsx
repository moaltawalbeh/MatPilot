"use client";

import { Page } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useLanguage } from "@/components/language-provider";
import {
  useDashboardStats,
  useProjects,
  useJobs,
  useSamples,
  useActivities,
  useNotifications,
  useStructures,
  useDownloads,
  useSystemHealth,
  useMeasurements,
} from "@/hooks/use-api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  FolderKanban,
  FlaskConical,
  BarChart3,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownToLine,
  Activity,
  Upload,
  Search,
  FileStack,
  Beaker,
  Bell,
  Download,
  Cpu,
  Database,
  Sparkles,
  Eye,
  Zap,
  Layers,
  Waves,
  AudioLines,
  Sun,
  Microscope,
  Atom,
  ScanEye,
  Target,
  Thermometer,
  Flame,
  CircleDot,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function Dashboard() {
  const { t } = useLanguage();
  const router = useRouter();

  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: jobsData, isLoading: loadingJobs } = useJobs();
  const { data: samplesData, isLoading: loadingSamples } = useSamples({ limit: 5 });
  const { data: activitiesData, isLoading: loadingActivities } = useActivities({ limit: 8 });
  const { data: notificationsData } = useNotifications({ unread_only: true, limit: 5 });
  const { data: structuresData, isLoading: loadingStructures } = useStructures({ limit: 5 });
  const { data: downloadsData, isLoading: loadingDownloads } = useDownloads({ status: "PENDING", limit: 5 });
  const { data: health, isLoading: loadingHealth } = useSystemHealth();

  const [searchQuery, setSearchQuery] = useState("");

  const allProjects = projects ?? [];
  const jobs = jobsData?.jobs ?? [];
  const allSamples = samplesData?.samples ?? [];
  const activities = activitiesData?.activities ?? [];
  const notifications = notificationsData?.notifications ?? [];
  const structures = structuresData?.structures ?? [];
  const downloads = downloadsData?.downloads ?? [];
  const activeJobs = jobs.filter((j) => j.status === "RUNNING");
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED");
  const runningCount = activeJobs.length;
  const completedCount = completedJobs.length;

  const totalProjects = stats?.total_projects ?? allProjects.length;
  const totalSamples = stats?.total_samples ?? allSamples.length;
  const totalMeasurements = stats?.total_measurements ?? 0;
  const activeJobCount = stats?.active_jobs ?? runningCount;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const metricCards = [
    { label: t.dash_projects, value: totalProjects, icon: FolderKanban, color: "var(--accent-orange)" },
    { label: "Samples", value: totalSamples, icon: Beaker, color: "var(--accent-cyan)" },
    { label: "Measurements", value: totalMeasurements, icon: BarChart3, color: "var(--accent-emerald)" },
    { label: "Active Jobs", value: activeJobCount, icon: Zap, color: "var(--accent-violet)" },
  ];

  const quickActions = [
    { label: "Upload Data", icon: Upload, href: "/projects", color: "var(--accent-orange)" },
    { label: "New Project", icon: Plus, href: "/projects", color: "var(--accent-cyan)" },
    { label: "Search Database", icon: Search, href: "/search", color: "var(--accent-emerald)" },
    { label: "AI Assistant", icon: Sparkles, href: "/assistant", color: "var(--accent-violet)" },
  ];

  const characterizationModules = [
    { name: "XRD", icon: Atom, color: "var(--accent-orange)", available: true, href: "/experiments" },
    { name: "Raman", icon: Waves, color: "var(--accent-cyan)", available: false, href: "/characterization/raman" },
    { name: "FTIR", icon: AudioLines, color: "var(--accent-emerald)", available: false, href: "/characterization/ftir" },
    { name: "UV-Vis", icon: Sun, color: "var(--accent-amber)", available: false, href: "/characterization/uv-vis" },
    { name: "SEM", icon: Microscope, color: "var(--accent-violet)", available: false, href: "/characterization/sem" },
    { name: "EDS", icon: ScanEye, color: "var(--accent-rose)", available: false, href: "/characterization/eds" },
    { name: "TEM", icon: Eye, color: "var(--accent-cyan)", available: false, href: "/characterization/tem" },
    { name: "XPS", icon: Target, color: "var(--accent-orange)", available: false, href: "/characterization/xps" },
    { name: "TGA", icon: Thermometer, color: "var(--accent-emerald)", available: false, href: "/characterization/tga" },
    { name: "DSC", icon: Flame, color: "var(--accent-rose)", available: false, href: "/characterization/dsc" },
    { name: "BET", icon: CircleDot, color: "var(--accent-violet)", available: false, href: "/characterization/bet" },
    { name: "DLS", icon: Zap, color: "var(--accent-cyan)", available: false, href: "/characterization/dls" },
  ];

  const workflowSteps = [
    { step: 1, name: "Upload", desc: "Import diffraction data", color: "var(--accent-orange)" },
    { step: 2, name: "Preprocessing", desc: "Background & stripping", color: "var(--accent-cyan)" },
    { step: 3, name: "Phase ID", desc: "Mineral matching", color: "var(--accent-emerald)" },
    { step: 4, name: "Refinement", desc: "Rietveld analysis", color: "var(--accent-violet)" },
    { step: 5, name: "Report", desc: "Export results", color: "var(--accent-amber)" },
  ];

  const activityIconMap: Record<string, { icon: typeof Upload; color: string }> = {
    FILE_UPLOADED: { icon: Upload, color: "var(--accent-orange)" },
    PROJECT_CREATED: { icon: Plus, color: "var(--accent-emerald)" },
    PROJECT_UPDATED: { icon: TrendingUp, color: "var(--accent-cyan)" },
    MEASUREMENT_STARTED: { icon: Zap, color: "var(--accent-violet)" },
    MEASUREMENT_COMPLETED: { icon: BarChart3, color: "var(--accent-emerald)" },
    PHASE_IDENTIFICATION_RUN: { icon: Search, color: "var(--accent-cyan)" },
    RIETVELD_REFINEMENT_RUN: { icon: Sparkles, color: "var(--accent-violet)" },
    REPORT_GENERATED: { icon: FileStack, color: "var(--accent-orange)" },
    SAMPLE_CREATED: { icon: Beaker, color: "var(--accent-cyan)" },
    SAMPLE_UPDATED: { icon: Beaker, color: "var(--accent-cyan)" },
    STRUCTURE_IMPORTED: { icon: Database, color: "var(--accent-violet)" },
    COLLECTION_CREATED: { icon: Layers, color: "var(--accent-emerald)" },
    SEARCH_PERFORMED: { icon: Search, color: "var(--accent-orange)" },
    DOWNLOAD_COMPLETED: { icon: Download, color: "var(--accent-emerald)" },
    USER_LOGIN: { icon: Eye, color: "var(--text-muted)" },
  };

  function relativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <Page
      eyebrow="Workspace"
      title={t.dash_title}
      description={t.dash_subtitle}
      actions={
        <Link href="/projects" className="button primary" style={{ textDecoration: "none" }}>
          <Plus size={15} /> New Project
        </Link>
      }
    >
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <div className="composer" style={{ maxWidth: 520 }}>
          <Search size={15} style={{ color: "var(--text-muted)", marginLeft: 10 }} />
          <input
            type="text"
            placeholder="Search projects, samples, structures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" aria-label="Search">
            <ArrowUpRight size={15} />
          </button>
        </div>
      </form>

      {/* ═══ Metric Cards ═══ */}
      <div className="grid metrics" style={{ marginBottom: 20 }}>
        {metricCards.map((m, i) => (
          <div
            className={`card animate-fade-in stagger-${i + 1}`}
            key={m.label}
            style={{
              padding: "18px 20px",
              display: "flex",
              gap: 14,
              alignItems: "center",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = m.color;
              e.currentTarget.style.boxShadow = `0 0 0 1px ${m.color}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "var(--radius-md)",
                background: `${m.color}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <m.icon size={20} style={{ color: m.color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 2 }}>{m.label}</div>
              {loadingStats ? (
                <Skeleton style={{ width: 40, height: 24 }} />
              ) : (
                <div className="number">{m.value}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Characterization Modules ═══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 2px" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.2px" }}>Characterization Modules</h2>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>Available analytical techniques</p>
          </div>
          <FlaskConical size={16} style={{ color: "var(--text-muted)" }} />
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "thin",
          }}
        >
          {characterizationModules.map((mod, i) => (
            <Link
              key={mod.name}
              href={mod.href}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className={`card animate-fade-in stagger-${Math.min(i + 1, 6)}`}
                style={{
                  padding: "14px 16px",
                  minWidth: 110,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  transition: "border-color 0.15s ease, transform 0.12s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = mod.color;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.transform = "";
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "var(--radius-sm)",
                    background: `${mod.color}12`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <mod.icon size={17} style={{ color: mod.color }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{mod.name}</span>
                <span
                  className={`badge ${mod.available ? "good" : ""}`}
                  style={{ fontSize: 10, padding: "1px 7px" }}
                >
                  {mod.available ? "Available" : "Coming Soon"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ Quick Actions + AI Assistant + System Status ═══ */}
      <div className="grid three" style={{ marginBottom: 20 }}>
        {/* Quick Actions */}
        <section className="card">
          <div className="section">
            <div>
              <h2>Quick Actions</h2>
              <span className="muted">Common tasks</span>
            </div>
          </div>
          <div style={{ padding: "4px 20px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {quickActions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "16px 8px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${a.color}`;
                  e.currentTarget.style.background = `${a.color}08`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-md)",
                    background: `${a.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <a.icon size={17} style={{ color: a.color }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* AI Assistant */}
        <section className="card">
          <div className="section">
            <div>
              <h2>AI Assistant</h2>
              <span className="muted">Intelligent analysis helper</span>
            </div>
            <Sparkles size={16} style={{ color: "var(--accent-violet)" }} />
          </div>
          <div style={{ padding: "4px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Get help with phase identification, structure refinement, data interpretation, and report generation.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {["XRD pattern analysis", "Rietveld refinement tips", "Material characterization guidance"].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-tertiary)" }}>
                  <CheckCircle2 size={12} style={{ color: "var(--accent-emerald)", flexShrink: 0 }} />
                  {item}
                </div>
              ))}
            </div>
            <Link
              href="/assistant"
              className="button primary"
              style={{ textDecoration: "none", alignSelf: "stretch", justifyContent: "center", marginTop: 4 }}
            >
              <Sparkles size={14} /> Open Assistant
            </Link>
          </div>
        </section>

        {/* System Status */}
        <section className="card">
          <div className="section">
            <div>
              <h2>{t.dash_health}</h2>
              <span className="muted">Platform health</span>
            </div>
          </div>
          <div style={{ padding: "4px 20px 20px" }}>
            {loadingHealth ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Skeleton style={{ width: 10, height: 10, borderRadius: "50%" }} />
                    <div style={{ flex: 1 }}>
                      <Skeleton style={{ width: "70%", height: 12, marginBottom: 4 }} />
                      <Skeleton style={{ width: "40%", height: 10 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: health?.status === "healthy" ? "var(--success)" : "var(--warning)",
                      flexShrink: 0,
                      boxShadow: health?.status === "healthy" ? "0 0 6px var(--success)" : "0 0 6px var(--warning)",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 550, color: "var(--text-primary)" }}>
                      {health?.status === "healthy" ? "All Systems Operational" : "Degraded Performance"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                      v{health?.version ?? "—"} · {health?.environment ?? "dev"}
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                  {health?.components && Object.entries(health.components).map(([key, val]) => {
                    const ok = typeof val === "string" ? val === "ok" || val === "healthy" : Boolean(val);
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className={`badge ${ok ? "good" : "warn"}`} style={{ fontSize: 10 }}>
                          {ok ? "OK" : "Warn"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ═══ Recent Activity + Job Status + Notifications ═══ */}
      <div className="grid three" style={{ marginBottom: 20 }}>
        {/* Recent Activity Feed */}
        <section className="card">
          <div className="section">
            <div>
              <h2>Recent Activity</h2>
              <span className="muted">Latest actions across projects</span>
            </div>
          </div>
          {loadingActivities ? (
            <div style={{ padding: "0 20px 12px" }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <Skeleton style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton style={{ width: "70%", height: 12, marginBottom: 6 }} />
                    <Skeleton style={{ width: "30%", height: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div style={{ padding: "0 20px 12px" }}>
              {activities.slice(0, 6).map((a) => {
                const mapping = activityIconMap[a.activity_type] || { icon: Activity, color: "var(--text-muted)" };
                const Icon = mapping.icon;
                return (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-sm)",
                        background: `${mapping.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <Icon size={13} style={{ color: mapping.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={10} />
                        {relativeTime(a.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="Create a project to start tracking your characterization work."
              action={{ label: "Create Project", href: "/projects" }}
            />
          )}
        </section>

        {/* Job Status */}
        <section className="card">
          <div className="section">
            <div>
              <h2>Job Status</h2>
              <span className="muted">Running and completed jobs</span>
            </div>
            <Link href="/projects" className="button ghost sm" style={{ textDecoration: "none" }}>
              View all
            </Link>
          </div>
          {loadingJobs ? (
            <div style={{ padding: "0 20px 16px" }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <Skeleton style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton style={{ width: "60%", height: 12, marginBottom: 4 }} />
                    <Skeleton style={{ width: "40%", height: 10 }} />
                  </div>
                  <Skeleton style={{ width: 50, height: 18, borderRadius: 9999 }} />
                </div>
              ))}
            </div>
          ) : jobs.length > 0 ? (
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <span className="badge info">{runningCount} running</span>
                <span className="badge good">{completedCount} completed</span>
                {jobs.length - runningCount - completedCount > 0 && (
                  <span className="badge">{jobs.length - runningCount - completedCount} other</span>
                )}
              </div>
              {jobs.slice(0, 5).map((j) => (
                <div
                  key={j.job_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        j.status === "COMPLETED"
                          ? "var(--success)"
                          : j.status === "RUNNING"
                          ? "var(--accent-orange)"
                          : "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {j.job_type}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      <Clock size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                      {j.created_at.slice(0, 16).replace("T", " ")}
                      {j.status === "RUNNING" ? ` · ${Math.round(j.progress)}%` : ""}
                    </div>
                  </div>
                  <span className={`badge ${j.status === "COMPLETED" ? "good" : j.status === "RUNNING" ? "info" : ""}`} style={{ fontSize: 10 }}>
                    {j.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Cpu}
              title="No jobs yet"
              description="Run an analysis pipeline to see job status here."
            />
          )}
        </section>

        {/* Notifications */}
        <section className="card">
          <div className="section">
            <div>
              <h2>Notifications</h2>
              <span className="muted">Unread alerts</span>
            </div>
            {notificationsData && notificationsData.unread_count > 0 && (
              <span className="badge bad" style={{ fontSize: 10 }}>{notificationsData.unread_count}</span>
            )}
          </div>
          {notifications.length > 0 ? (
            <div style={{ padding: "0 20px 12px" }}>
              {notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        n.priority === "URGENT" || n.priority === "HIGH"
                          ? "var(--error)"
                          : n.priority === "NORMAL"
                          ? "var(--accent-orange)"
                          : "var(--text-muted)",
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {relativeTime(n.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title="All caught up"
              description="No unread notifications at this time."
            />
          )}
        </section>
      </div>

      {/* ═══ Recent Projects + Recent Samples ═══ */}
      <div className="grid three" style={{ marginBottom: 20 }}>
        {/* Recent Projects Table */}
        <section className="card" style={{ gridColumn: "span 2" }}>
          <div className="section">
            <div>
              <h2>{t.dash_recent}</h2>
              <span className="muted">Your active characterization work</span>
            </div>
            <Link href="/projects" className="button ghost sm" style={{ textDecoration: "none" }}>View all</Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Material</th>
                <th>Files</th>
                <th>Experiments</th>
                <th>Updated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingProjects ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td><Skeleton style={{ width: "60%", height: 12 }} /></td>
                    <td><Skeleton style={{ width: "50%", height: 12 }} /></td>
                    <td><Skeleton style={{ width: 20, height: 12 }} /></td>
                    <td><Skeleton style={{ width: 20, height: 12 }} /></td>
                    <td><Skeleton style={{ width: "70%", height: 12 }} /></td>
                    <td><Skeleton style={{ width: 50, height: 16, borderRadius: 9999 }} /></td>
                  </tr>
                ))
              ) : allProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-tertiary)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <FolderKanban size={20} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                      <span>No projects yet.{" "}
                        <Link href="/projects" style={{ color: "var(--accent-orange)" }}>Create your first project</Link>{" "}to get started.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                allProjects.slice(0, 5).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/projects/${p.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
                        <strong>{p.name}</strong>
                      </Link>
                    </td>
                    <td>{p.material || "—"}</td>
                    <td>{p.files}</td>
                    <td>{p.experiments}</td>
                    <td style={{ color: "var(--text-tertiary)" }}>{p.updated_at.slice(0, 10)}</td>
                    <td>
                      <span className={`badge ${p.status === "Complete" ? "good" : p.status === "Active" ? "info" : ""}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Recent Samples */}
        <section className="card">
          <div className="section">
            <div>
              <h2>Recent Samples</h2>
              <span className="muted">Latest registered materials</span>
            </div>
            <Link href="/samples" className="button ghost sm" style={{ textDecoration: "none" }}>View all</Link>
          </div>
          {loadingSamples ? (
            <div style={{ padding: "0 20px 12px" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <Skeleton style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton style={{ width: "60%", height: 12, marginBottom: 4 }} />
                    <Skeleton style={{ width: "40%", height: 10 }} />
                  </div>
                  <Skeleton style={{ width: 50, height: 16, borderRadius: 9999 }} />
                </div>
              ))}
            </div>
          ) : allSamples.length > 0 ? (
            <div style={{ padding: "0 20px 12px" }}>
              {allSamples.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--accent-cyan-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Beaker size={13} style={{ color: "var(--accent-cyan)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      {s.formula || "No formula"} · {s.crystal_system || "—"}
                    </div>
                  </div>
                  <span className={`badge ${s.status === "ACTIVE" ? "good" : s.status === "DRAFT" ? "warn" : ""}`} style={{ fontSize: 10 }}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Beaker}
              title="No samples yet"
              description="Register a sample to begin characterization."
              action={{ label: "Register Sample", href: "/samples" }}
            />
          )}
        </section>
      </div>

      {/* ═══ Workflow Pipeline ═══ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 2px" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.2px" }}>Analysis Pipeline</h2>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>XRD analysis workflow stages</p>
          </div>
          <Layers size={16} style={{ color: "var(--text-muted)" }} />
        </div>
        <div
          className="card"
          style={{
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            gap: 0,
            overflowX: "auto",
          }}
        >
          {workflowSteps.map((step, i) => (
            <div key={step.step} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 120,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--radius-lg)",
                    background: `${step.color}12`,
                    border: `1px solid ${step.color}25`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: step.color,
                  }}
                >
                  {step.step}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{step.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{step.desc}</div>
                </div>
              </div>
              {i < workflowSteps.length - 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 1,
                      background: "var(--border-default)",
                    }}
                  />
                  <ArrowRight
                    size={14}
                    style={{
                      color: "var(--text-muted)",
                      position: "absolute",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Popular Structures + Download Queue ═══ */}
      <div className="grid two" style={{ marginBottom: 20 }}>
        {/* Popular Structures */}
        <section className="card">
          <div className="section">
            <div>
              <h2>Popular Structures</h2>
              <span className="muted">Top crystal structures in database</span>
            </div>
            <Link href="/structures" className="button ghost sm" style={{ textDecoration: "none" }}>View all</Link>
          </div>
          {loadingStructures ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>Formula</th>
                  <th>Space Group</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td><Skeleton style={{ width: "60%", height: 12 }} /></td>
                    <td><Skeleton style={{ width: "50%", height: 12 }} /></td>
                    <td><Skeleton style={{ width: "40%", height: 12 }} /></td>
                    <td><Skeleton style={{ width: 40, height: 16, borderRadius: 9999 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : structures.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>Formula</th>
                  <th>Space Group</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {structures.slice(0, 5).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ color: "var(--text-primary)" }}>{s.name}</strong>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{s.formula}</td>
                    <td>{s.space_group || "—"}</td>
                    <td>
                      <span className="badge indigo" style={{ fontSize: 10 }}>{s.source}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={Database}
              title="No structures yet"
              description="Crystal structures will appear here once imported."
            />
          )}
        </section>

        {/* Download Queue */}
        <section className="card">
          <div className="section">
            <div>
              <h2>Download Queue</h2>
              <span className="muted">Pending file exports</span>
            </div>
          </div>
          {loadingDownloads ? (
            <div style={{ padding: "0 20px 12px" }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <Skeleton style={{ width: 28, height: 28, borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton style={{ width: "70%", height: 12, marginBottom: 4 }} />
                    <Skeleton style={{ width: "50%", height: 10 }} />
                  </div>
                  <Skeleton style={{ width: 60, height: 16, borderRadius: 9999 }} />
                </div>
              ))}
            </div>
          ) : downloads.length > 0 ? (
            <div style={{ padding: "0 20px 12px" }}>
              {downloads.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--accent-emerald-bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <ArrowDownToLine size={13} style={{ color: "var(--accent-emerald)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.filename}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      {d.download_type.replace(/_/g, " ")} · {d.file_size_bytes ? `${(d.file_size_bytes / 1024).toFixed(1)} KB` : "—"}
                    </div>
                  </div>
                  <span
                    className={`badge ${d.status === "READY" ? "good" : d.status === "PROCESSING" ? "info" : d.status === "FAILED" ? "bad" : ""}`}
                    style={{ fontSize: 10 }}
                  >
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Download}
              title="No pending downloads"
              description="Exports will appear here when ready."
            />
          )}
        </section>
      </div>
    </Page>
  );
}
