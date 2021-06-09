// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { HTMLElement, parse } from "node-html-parser";
import { Step, TP } from "./types";
import { getTpList, getTpNumber } from "./tpList";

/**
 * Updates the webview panel with the app's HTML.
 * @param context The extension's context.
 * @returns the updated webview panel.
 */
function initializeWebviewPanel(context: vscode.ExtensionContext) {
  // Create the webview panel within which the visualizer will be shown
  const panel = vscode.window.createWebviewPanel(
    "tpVisualizer",
    "TP de PHP (CSC4101)",
    vscode.ViewColumn.Beside,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  // Get the webview HTML and set it
  const pathToHtml = vscode.Uri.file(
    path.join(context.extensionPath, "src", "app", "index.html")
  );
  panel.webview.html = fs.readFileSync(pathToHtml.fsPath, "utf8");

  // Get the bootstrap.min.css file and send its URI to the webview (not working)
  const bootstrapCssFile = vscode.Uri.file(
    path.join(context.extensionPath, "src", "app", "bootstrap.min.css")
  );
  panel.webview.postMessage({
    command: "css",
    data: panel.webview.asWebviewUri(bootstrapCssFile),
  });

  return panel;
}

/**
 * Gets a TP subject as a single HTML element, parses it then passes
 * the resulting TP to the webview.
 * @param webview The extension's webview.
 * @param tp The loaded TP HTML, unparsed.
 */
function passTpToWebview(webview: vscode.Webview, tp: HTMLElement) {
  // Initialized the parsed TP using the main title, which includes the subtitle
  var parsedTp: TP = {
    title: tp.querySelector(".title").innerHTML,
    steps: [],
  };

  // Each TP step is contained in a div with the outline-2 class
  const tpSteps = tp.querySelectorAll(".outline-2");
  // Iterate through each step to create a parsed version and append its substeps
  tpSteps.forEach((element) => {
    var step: Step = {
      title: element.querySelector("h2").textContent,
      description: element.querySelector(".outline-text-2").innerHTML,
      substeps: [],
    };
    const substeps = element.querySelectorAll(".outline-3");
    substeps.forEach((substep) => {
      step.substeps.push(substep.toString());
    });
    // Add the parsed step to the parsed TP
    parsedTp.steps.push(step);
  });

  // Pass the parsed TP to the webview using a message
  webview.postMessage({
    command: "tp",
    data: parsedTp,
  });
}

/**
 * This function is called everytime the extension is launched.
 * @param context The extension's context, passed by VS Code.
 */
export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "tpvisualizer.tpVisualizer",
    () => {
      // Let the user pick a TP
      const choice = vscode.window
        .showQuickPick(getTpList(), {
          placeHolder: "Choisissez un TP",
        })
        .then((result) => {
          // If no choice was made, assume that the user canceled the choice
          if (result === undefined) {
            vscode.window.showWarningMessage("Choix de TP annulé.");
            return;
          }

          // Load the TP html file and parse it
          const tpFile = vscode.Uri.file(
            path.join(
              context.extensionPath,
              "src",
              "assets",
              `tp-${getTpNumber(result).toString().padStart(2, "0")}.html`
            )
          );

          const tpHtml = fs.readFileSync(tpFile.fsPath, "utf8");
          const tp = parse(tpHtml);

          // Initialize the visualizer webview panel
          const panel = initializeWebviewPanel(context);

          // Pass the parsed TP to the webview
          passTpToWebview(panel.webview, tp);
        });
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
