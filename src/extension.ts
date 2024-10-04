import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

let myStatusBarItem: vscode.StatusBarItem;
const terminal: vscode.Terminal = vscode.window.createTerminal({ name: 'react-server' });

export async function activate({ subscriptions }: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return false;

    try {
        const packageJsonPath = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, 'package.json'));
        const packageJson = await vscode.workspace.fs.readFile(packageJsonPath);
        const packageJsonContent = JSON.parse(packageJson.toString());

        if (packageJsonContent.dependencies?.react) {
            runExtension(subscriptions, workspaceFolder.uri.fsPath);
        }
    } catch (error) {
        console.error('Error reading package.json:', error);
        return false;
    }
}

function runExtension(subscriptions: vscode.Disposable[], workspacePath: string) {
    const myCommandId = 'mdhamel.startReactServer';
    let isRunning = false;

    const startText = `$(vm)  Start React App`;
    const runningText = `$(vm-running)  React App Running`;

    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 7);
    myStatusBarItem.command = myCommandId;
    subscriptions.push(myStatusBarItem);
    myStatusBarItem.text = startText;
    myStatusBarItem.show();

    subscriptions.push(vscode.commands.registerCommand(myCommandId, async () => {
        const packageManager = await detectPackageManager(workspacePath);
        const npmCommand = getStartCommand(packageManager);

        if (isRunning) {
            terminal.sendText('\x03\n'); // Stop the running process
            myStatusBarItem.text = startText;
        } else {
            terminal.sendText(`${npmCommand}\n`); // Start the server
            myStatusBarItem.text = runningText;
        }

        myStatusBarItem.show();
        isRunning = !isRunning;
    }));
}

async function detectPackageManager(workspacePath: string): Promise<string> {
    const managers = ['npm', 'yarn', 'pnpm'];
    for (const manager of managers) {
        if (await isPackageManagerAvailable(manager)) {
            return manager;
        }
    }
    throw new Error('No package manager found (npm, yarn, pnpm)');
}

function getStartCommand(manager: string): string {
    switch (manager) {
        case 'yarn':
            return 'yarn start';
        case 'pnpm':
            return 'pnpm start';
        default:
            return 'npm run start';
    }
}

async function isPackageManagerAvailable(manager: string): Promise<boolean> {
    return new Promise((resolve) => {
        exec(`${manager} --version`, (error: Error | null) => {
            resolve(!error);
        });
    });
}


