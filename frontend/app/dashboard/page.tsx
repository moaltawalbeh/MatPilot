"use client";

import { Page } from "@/components/ui/page";
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
    { label: "New Sample", icon: Beaker, href: "/samples", color: "var(--accent-emerald)" },
    { label: "Search Database", icon: Search, href: "/search", color: "var(--accent-violet)" },
  ];

  const workflowSteps = [
    { step: "1", name: "Create Project", desc: "Organize your research", href: "/projects", color: "var(--accent-orange)" },
    { step: "2", name: "Upload XRD Data", desc: "Import diffraction patterns", href: "/projects", color: "var(--accent-cyan)" },
    { step: "3", name: "Run Pipeline", desc: "Automatic preprocessing & analysis", href: "/projects", color: "var(--accent-emerald)" },
    { step: "4", name: "View Results", desc: "Phase ID & refinement stats", href: "/projects", color: "var(--accent-violet)" },
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
          <Plus size={15} /> New project
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

      {/* Metric Cards — 4 columns */}
      <div className="grid metrics" style={{ marginBottom: 20 }}>
        {metricCards.map((m, i) => (
          <div
            className={`card animate-fade-in stagger-${i + 1}`}
            key={m.label}
            style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "start" }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-md)",
                background: `${m.color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <m.icon size={17} style={{ color: m.color }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{m.label}</div>
              <div className="number">{loadingStats ? "—" : m.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Quick Actions + Workflow Steps + System Status */}
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

        {/* Workflow Steps */}
        <section className="card">
          <div className="section">
            <div>
              <h2>{t.dash_quick_start}</h2>
              <span className="muted">XRD analysis pipeline</span>
            </div>
          </div>
          <div style={{ padding: "4px 20px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {workflowSteps.map((item) => (
                <Link
                  key={item.step}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "background 0.12s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--radius-sm)",
                      background: `${item.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: item.color,
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 550 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{item.desc}</div>
                  </div>
                  <ArrowUpRight size={14} color="var(--text-muted)" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* System Status */}
        <section className="card">
          <div className="section">
            <div>
              <h2>System Status</h2>
              <span className="muted">Platform health</span>
            </div>
          </div>
          <div style={{ padding: "4px 20px 20px" }}>
            {loadingHealth ? (
              <div style={{ padding: 20, textAlign: "center" }}>
                <Activity size={20} className="spin" style={{ color: "var(--text-muted)" }} />
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

      {/* Row 3: Recent Activity + Job Status + Notifications */}
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
            <div style={{ padding: 30, textAlign: "center" }}>
              <Activity size={20} className="spin" style={{ color: "var(--text-muted)" }} />
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
            <p className="muted" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>
              No activity yet. Create a project to get started.
            </p>
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
            <div style={{ padding: 30, textAlign: "center" }}>
              <Activity size={20} className="spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : jobs.length > 0 ? (
            <div style={{ padding: "0 20px 16px" }}>
              {/* Summary badges */}
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
            <p className="muted" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>
              No jobs yet. Run an analysis to see job status here.
            </p>
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
            <p className="muted" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>
              No unread notifications.
            </p>
          )}
        </section>
      </div>

      {/* Row 4: Recent Projects + Recent Samples + Popular Structures */}
      <div className="grid three" style={{ marginBottom: 20 }}>
        {/* Recent Projects Table */}
        <section className="card" style={{ gridColumn: "span 2" }}>
          <div className="section">
            <div>
              <h2>Recent Projects</h2>
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
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24 }}>
                    <Activity size={18} className="spin" style={{ color: "var(--text-muted)" }} />
                  </td>
                </tr>
              ) : allProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-tertiary)" }}>
                    No projects yet.{" "}
                    <Link href="/projects" style={{ color: "var(--accent-orange)" }}>Create your first project</Link>{" "}to get started.
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
            <div style={{ padding: 30, textAlign: "center" }}>
              <Activity size={20} className="spin" style={{ color: "var(--text-muted)" }} />
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
            <p className="muted" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>
              No samples yet. Register a sample to begin.
            </p>
          )}
        </section>
      </div>

      {/* Row 5: Popular Structures + Download Queue */}
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
            <div style={{ padding: 30, textAlign: "center" }}>
              <Activity size={20} className="spin" style={{ color: "var(--text-muted)" }} />
            </div>
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
            <p className="muted" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>
              No structures in database yet.
            </p>
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
            <div style={{ padding: 30, textAlign: "center" }}>
              <Activity size={20} className="spin" style={{ color: "var(--text-muted)" }} />
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
            <p className="muted" style={{ padding: 20, textAlign: "center", fontSize: 13 }}>
              No pending downloads.
            </p>
          )}
        </section>
      </div>
    </Page>
  );
}
