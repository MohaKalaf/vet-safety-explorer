// https://open.fda.gov/apis/animalandveterinary/event/
// Only the fields used here. openFDA sends every value as a string, even numbers/booleans.

export interface RawReaction {
  veddra_term_name?: string;
  veddra_term_code?: string;
  number_of_animals_affected?: string;
}

export interface RawActiveIngredient {
  name?: string;
}

export interface RawDrug {
  brand_name?: string;
  route?: string;
  active_ingredients?: RawActiveIngredient[];
}

export interface RawAnimal {
  species?: string;
  gender?: string;
  breed?: { breed_component?: string | string[] };
  age?: { min?: string; unit?: string };
}

export interface RawOutcome {
  medical_status?: string;
}

export interface RawReport {
  unique_aer_id_number?: string;
  original_receive_date?: string; // "YYYYMMDD"
  serious_ae?: string; // "true" | "false"
  primary_reporter?: string;
  animal?: RawAnimal;
  drug?: RawDrug[];
  reaction?: RawReaction[];
  outcome?: RawOutcome[];
}

export interface OpenFdaResponse<T> {
  meta?: {
    last_updated?: string; // "YYYY-MM-DD"
    results?: { skip: number; limit: number; total: number };
  };
  results: T[];
}

// Rows from count=<text field>
export interface TermCount {
  term: string;
  count: number;
}

// Rows from count=<date field>
export interface TimeCount {
  time: string; // "YYYYMMDD"
  count: number;
}

// --- UI shapes ---

export interface SearchFilters {
  ingredient?: string;
  species?: string;
}

export interface ReportSummary {
  id: string;
  receivedDate: string | null; // "YYYY-MM-DD"
  species: string;
  breed: string;
  serious: boolean;
  reporter: string;
  drugs: string[];
  reactions: string[];
  outcome: string;
}

export interface YearCount {
  year: number;
  count: number;
}

export interface SafetyOverview {
  dataLastUpdated: string | null; // "YYYY-MM-DD"
  totalReports: number;
  seriousReports: number;
  topReactions: TermCount[];
  reportsByYear: YearCount[];
  recentReports: ReportSummary[];
}
