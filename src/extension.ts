import * as vscode from "vscode";
import { MainController } from "./mainController";

export function activate(context: vscode.ExtensionContext) {
  const controller = new MainController(context);
}

export function deactivate() {}
