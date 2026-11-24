// Sidebar modules. Add a new module here; set enabled:false to list it as "Coming soon".
export type ModuleId = "overview" | "verification" | "complaints" | "id-cards";

export interface DashboardModule {
  id: ModuleId;
  label: string;
  enabled: boolean;
}

export const MODULES: DashboardModule[] = [
  { id: "overview", label: "Overview", enabled: true },
  { id: "verification", label: "Document verification", enabled: true }, // tabs: summary, student records
  { id: "complaints", label: "Complaints and requests", enabled: true },
  { id: "id-cards", label: "ID cards", enabled: false },
];

export const COMING_SOON_LABEL = "Coming soon";
