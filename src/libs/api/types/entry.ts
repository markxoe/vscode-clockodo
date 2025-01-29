export namespace ClockodoTypes {
  export enum EntryBillable {
    NotBillable = 0,
    Billable = 1,
    AlreadyBilled = 2,
  }

  export enum EntryType {
    TimeEntry = 0,
    // todo: translate:
    PauschalWertEntry = 1,
    EntryWithPauschalleistung = 2,
  }

  export interface Entry {
    id: number;
    customers_id: number;
    projects_id?: number;
    users_id: number;
    billable: EntryBillable;
    texts_id?: number;
    time_since: string; // Date
    time_until?: string; // Date
    type: EntryType;
  }

  export interface EntryTime extends Entry {
    type: EntryType.TimeEntry;
    services_id: number;
    duration?: number; // seconds
    offset: number; // seconds
    clocked: boolean;
    clocked_offline: boolean;
    time_clocked_since?: string; // Date
    text?: string;
  }
}
