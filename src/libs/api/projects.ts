import { ClockodoLoginData, getAxios } from "./axios";
import { Paging } from "./types/pagination";
import { Project } from "./types/project";

export const getProjects = async (
  loginData: ClockodoLoginData,
  page?: number,
  filter_active?: boolean
) =>
  getAxios(loginData).get<{ paging: Paging; projects: Project[] }>(
    "v2/projects",
    {
      params: {
        page,
        "filter[active]": filter_active,
      },
    }
  );
