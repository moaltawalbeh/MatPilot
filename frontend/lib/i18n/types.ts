export type Locale = "en" | "ar" | "de";

export type TranslationKeys = {
  // Navigation
  nav_home: string;
  nav_dashboard: string;
  nav_projects: string;
  nav_experiments: string;
  nav_workflow: string;
  nav_results: string;
  nav_reports: string;
  nav_database: string;
  nav_settings: string;
  nav_services: string;
  nav_about: string;
  nav_launch: string;
  nav_characterization: string;
  nav_xrd: string;
  nav_raman: string;
  nav_ftir: string;
  nav_uvvis: string;
  nav_sem: string;
  nav_eds: string;
  nav_tem: string;
  nav_xps: string;
  nav_tga: string;
  nav_dsc: string;
  nav_bet: string;
  nav_dls: string;

  // Landing page
  landing_title: string;
  landing_subtitle: string;
  landing_developer: string;
  landing_launch: string;
  landing_learn_more: string;
  landing_what_is: string;
  landing_what_is_desc: string;
  landing_workflow_title: string;
  landing_features_title: string;
  landing_tech_title: string;
  landing_footer_copy: string;
  landing_footer_version: string;

  // Features
  feature_xrd: string;
  feature_xrd_desc: string;
  feature_reference: string;
  feature_reference_desc: string;
  feature_phase_id: string;
  feature_phase_id_desc: string;
  feature_rietveld: string;
  feature_rietveld_desc: string;
  feature_reports: string;
  feature_reports_desc: string;
  feature_charts: string;
  feature_charts_desc: string;

  // Workflow steps
  wf_upload: string;
  wf_background: string;
  wf_peak: string;
  wf_phase: string;
  wf_cod: string;
  wf_rietveld: string;
  wf_report: string;

  // Dashboard
  dash_title: string;
  dash_subtitle: string;
  dash_projects: string;
  dash_experiments: string;
  dash_analyses: string;
  dash_health: string;
  dash_quick_start: string;
  dash_recent: string;

  // Common
  loading: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  upload: string;
  download: string;
  search: string;
  back: string;
  no_data: string;
  error: string;
  success: string;
  language: string;

  // Coming Soon
  coming_soon_title: string;
  coming_soon_desc: string;
};
