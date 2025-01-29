import { workspace } from "vscode";

const defaultActivityFetchInterval = 10;

export class Settings {
  // Note: returns seconds
  static getActivityFetchInterval(): number {
    return workspace
      .getConfiguration()
      .get(
        "unofficialClockodo.activityFetchInterval",
        defaultActivityFetchInterval
      );
  }
}
