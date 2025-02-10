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

  export const entryDiffers = (a: Entry, b: Entry) => {
    if (
      a.customers_id !== b.customers_id ||
      a.projects_id !== b.projects_id ||
      a.users_id !== b.users_id ||
      a.billable !== b.billable ||
      a.texts_id !== b.texts_id ||
      a.time_since !== b.time_since ||
      a.time_until !== b.time_until ||
      a.type !== b.type
    ) {
      return false;
    }

    if (a.type === EntryType.TimeEntry) {
      const aT = a as EntryTime;
      const bT = b as EntryTime;

      return (
        aT.services_id !== bT.services_id ||
        aT.duration !== bT.duration ||
        aT.offset !== bT.offset ||
        aT.clocked !== bT.clocked ||
        aT.clocked_offline !== bT.clocked_offline ||
        aT.time_clocked_since !== bT.time_clocked_since ||
        aT.text !== bT.text
      );
    }

    return true;
  };
}
