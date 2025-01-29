import { ClockodoLoginData, getAxios } from "./axios";
import { ClockodoTypes } from "./types/entry";

export namespace ClockodoClock {
  export const clockStart = async (
    login: ClockodoLoginData,
    payload: {
      customers_id: number;
      projects_id?: number;
      services_id: number;
      billable?: ClockodoTypes.EntryBillable;
      text?: string;
      users_id?: number;
    }
  ) =>
    getAxios(login).post<{ running: ClockodoTypes.EntryTime }>(
      "v2/clock",
      payload
    );

  export const clockGet = async (login: ClockodoLoginData) =>
    getAxios(login).get<{ running?: ClockodoTypes.EntryTime }>("v2/clock");

  export const clockStop = async (login: ClockodoLoginData, stopId: number) =>
    getAxios(login).delete<{
      stopped: ClockodoTypes.EntryTime;
      running: ClockodoTypes.EntryTime;
    }>(`v2/clock/${stopId}`);
}
