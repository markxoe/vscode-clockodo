export interface Customer {
  id: number;
  name: string;
  number?: string;
  active: boolean;
  billable_default: boolean;
  note?: string;
  color: number;
}
