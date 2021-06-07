// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { HTMLElement, parse } from "node-html-parser";

function initializeWebviewPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "tpVisualizer",
    "TP n°1 de PHP",
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );
  const pathToHtml = vscode.Uri.file(
    path.join(context.extensionPath, "src", "app", "index.html")
  );

  panel.webview.html = fs.readFileSync(pathToHtml.fsPath, "utf8");

  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case "previous":
          vscode.window.showInformationMessage("previous section");
          return;
        case "next":
          vscode.window.showInformationMessage("next section");
          return;
      }
    },
    undefined,
    context.subscriptions
  );

  const bootstrapCssFile = vscode.Uri.file(
    path.join(context.extensionPath, "src", "app", "bootstrap.min.css")
  );

  panel.webview.postMessage({
    command: "css",
    data: panel.webview.asWebviewUri(bootstrapCssFile),
  });

  return panel;
}

function passTpStepsToWebview(webview: vscode.Webview, steps: HTMLElement[]) {
  const uncircularizedSteps: string[] = [];
  steps.forEach((element) => {
    uncircularizedSteps.push(element.toString());
  });
  webview.postMessage({
    command: "tpSteps",
    data: uncircularizedSteps,
  });
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "tpvisualizer" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "tpvisualizer.tpVisualizer",
    () => {
      const tpFile = vscode.Uri.file(
        path.join(context.extensionPath, "src", "assets", "tp-01.html")
      );
      const tpHtml = fs.readFileSync(tpFile.fsPath, "utf8");
      const tp = parse(tpHtml);
      // The code you place here will be executed every time your command is executed
      const panel = initializeWebviewPanel(context);

      const tpSteps = tp.querySelectorAll(".outline-2");
      passTpStepsToWebview(panel.webview, tpSteps);
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
