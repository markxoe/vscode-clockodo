import axios from "axios";
import {
  clockodoApiBaseURL,
  clockodoExternernalApplicationHeader,
} from "./constants";

export interface ClockodoLoginData {
  email: string;
  apiKey: string;
}

const clockodoHeaders = ({ email, apiKey }: ClockodoLoginData) => {
  return {
    "X-Clockodo-External-Application": clockodoExternernalApplicationHeader,
    "X-ClockodoApiUser": email,
    "X-ClockodoApiKey": apiKey,
  };
};

export const getAxios = (loginData: ClockodoLoginData) =>
  axios.create({
    baseURL: clockodoApiBaseURL,
    headers: clockodoHeaders(loginData),
  });
