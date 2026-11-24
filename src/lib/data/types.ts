// Shapes shared by every data source. StudentRow holds ONLY allow-listed fields.

export interface StudentRow {
  uid: string;
  name: string;
  program: string;
  shortProgram: string;
  institute: string; // shown as "School"
  cluster: string;
  semester: string;
  /** Raw verification word as found in the source (program tab col AD). "" when blank. */
  rawStatus: string;
  feeStatus: string; // StatusID
  residence: string; // FilterStatus
}

export interface LoadAudit {
  source: string;
  sheetCount: number;
  programTabCount: number;
  rowCount: number;
  /** Master rows whose saved (cached) Verification Status differs from the program tab. */
  staleCacheRows: number;
  /** Master rows that have no program tab entry (e.g. DOCTORATE). */
  rowsWithoutProgramTab: number;
  loadedAt: string;
}

export interface LoadResult {
  rows: StudentRow[];
  audit: LoadAudit;
}

export interface DataSource {
  load(): Promise<LoadResult>;
}
