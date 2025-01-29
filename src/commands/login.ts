import { window } from "vscode";
import { ClockodoLoginData } from "../libs/api/axios";

export const loginCommand = async (
  onLoginData: (login: ClockodoLoginData) => void
) => {
  const email = await window.showInputBox({
    prompt: "Enter your Clockodo E-Mail",
    ignoreFocusOut: true,
  });

  if (!email || !email.includes("@")) {
    window.showErrorMessage("No E-Mail provided");
    return;
  }

  const apiKey = await window.showInputBox({
    prompt: "Enter your Clockodo API Key",
    ignoreFocusOut: true,
  });

  if (!apiKey) {
    window.showErrorMessage("No API Key provided");
    return;
  }

  onLoginData({ email, apiKey });
};
