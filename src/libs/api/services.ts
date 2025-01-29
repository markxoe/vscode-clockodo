import { ClockodoLoginData, getAxios } from "./axios";
import { Service } from "./types/service";

export const getServices = async (loginData: ClockodoLoginData) =>
  getAxios(loginData).get<{ services: Service[] }>("v2/services");
