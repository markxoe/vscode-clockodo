export interface Project {
  id: number;
  customers_id: number;
  name: string;
  number?: string; // Project number
  note?: string;
  active: boolean;
  billable_default: boolean;
  completed: boolean;
  completed_at?: string;
}
