import { ClockodoLoginData, getAxios } from "./axios";
import { Customer } from "./types/customer";
import { Paging } from "./types/pagination";

export const getCustomers = async (
  loginData: ClockodoLoginData,
  page?: number,
  filter_active?: boolean
) =>
  getAxios(loginData).get<{ paging: Paging; customers: Customer[] }>(
    "v2/customers",
    {
      params: {
        page,
        "filter[active]": filter_active,
      },
    }
  );
