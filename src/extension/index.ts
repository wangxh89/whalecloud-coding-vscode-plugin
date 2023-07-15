import * as vscode from "vscode";
import * as crypto from "crypto";
import axios from "axios";
import { simpleGit} from 'simple-git';
import {splitGitUrl} from  './utils';
import { Logger,LogLevel} from "./logger";
import { setTabnineExtensionContext } from "./huggingface/globals/tabnineExtensionContext";


import { GenerateSession, getScratchpadManager } from "./generate";
import { getGlobalState } from "./globalState";
import { ChatPanelProvider } from "./chat/chatPanelProvider";
import { sharedChatServiceImpl } from "./chat/chatServiceImpl";
import { setExtensionContext, signIn, signOut } from "@crates/cursor-core";
import { ExtensionContext } from "./context";
import { handleGenerateProjectCommand } from "./project";
let logger: Logger;
function setHasActiveGenerateSessionContext(value: boolean) {
    vscode.commands.executeCommand(
        "setContext",
        "whalecloud.hasActiveGenerateSession",
        value
    );
}

async function handleGenerateCodeCommand() {
    const input = await vscode.window.showInputBox({
        placeHolder: "Instructions for code to generate...",
    });
    if (!input) {
        return;
    }

    // Get the current editor and selection.
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    // End the active session first.
    const globalState = getGlobalState();
    const activeSession = globalState.activeSession;
    if (activeSession) {
        activeSession.dispose();
    }

    const session = new GenerateSession(input, editor);
    session.onDidDispose(() => {
        globalState.activeSession = null;
        setHasActiveGenerateSessionContext(false);
    });
    session.start();
    session.showResult();
    globalState.activeSession = session;
    setHasActiveGenerateSessionContext(true);
}





function initStartup(context: vscode.ExtensionContext): void {
    setTabnineExtensionContext(context);
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder found.');
      return;
    }

    const workspaceFolder = workspaceFolders[0];
    const workspaceFolderPath = workspaceFolder.uri.fsPath;

    const git = simpleGit(workspaceFolderPath);    
    git.getRemotes(true, (err, remotes) => {
        if (err) {
          logger.writeError("Failed to get git remote url." + workspaceFolderPath);
          return;
        }
  
        const remoteUrl = remotes[0].refs.fetch;
        getGlobalState().remoteUrl = remoteUrl;

        const result = splitGitUrl(remoteUrl);

        if (result) {
            let data = JSON.stringify({
                "git_host": result.gitHost,
                "org_name": result.orgName,
                "repo_name": result.repoName
            });

            logger.writeVerbose("当前工程git仓库的信息", data);
            if (! result.gitHost.endsWith("iwhalecloud.com")) {
                logger.writeVerbose("当前git host非iwhalecloud.com结尾，不进行高危文件查询  ");
                return;
            }
            let config = {
                method: 'post',
                url: 'https://dev.iwhalecloud.com/faas/serverless/codingplus/high-risk',
                headers: { 
                    'content-type': 'application/json'
                },
                data : data
            };
    
            axios.request(config).then((response) => {
              logger.writeVerbose("faas/serverless/codingplus/high-risk接口返回",  JSON.stringify(response.data));
              const data = response.data;
              if (data.rule_list) {
                    getGlobalState().ruleList =  data.rule_list;
              } 
            })
            .catch((error) => {
                logger.writeError("faas/serverless/codingplus/high-risk接口报错",error);
            });
        }

      });    
  }

export function activate(context: vscode.ExtensionContext) {
    // To use crypto features in WebAssembly, we need to add this polyfill.
    global.crypto = {
        getRandomValues: (arr: Uint8Array) => {
            crypto.randomFillSync(arr);
        },
    } as any;

    setExtensionContext(new ExtensionContext());
    getGlobalState().storage = context.globalState;
    logger = new Logger("diagnostic", context.globalStorageUri);

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => {
            logger.writeVerbose('Opened document: ' + document.fileName);
            // 判断是否是高风险  
            getGlobalState().ruleList.forEach(element => {
                if (document.fileName.indexOf(element.file_path) !== -1) {
                    let strMsg = '该代码文件为风险代码，修改需谨慎！';
                    if (element.comments && element.comments.length > 0) {
                        strMsg = '该代码文件为风险代码，修改需谨慎！原因：' + element.comments 
                    }
                    logger.writeAndShowWarning(strMsg);
                }
            });
            
        }),
        vscode.commands.registerCommand("whalecloud.generateCode", () => {
            handleGenerateCodeCommand();
        }),
        vscode.commands.registerCommand("whalecloud.showLastResult", () => {
            getGlobalState().activeSession?.showResult();
        }),
        vscode.commands.registerCommand("whalecloud.acceptChanges", () => {
            getGlobalState().activeSession?.applyChanges();
        }),
        vscode.commands.registerCommand("whalecloud.rejectChanges", () => {
            const globalState = getGlobalState();
            globalState.activeSession?.dispose();
            globalState.activeSession = null;
        }),
        vscode.commands.registerCommand("whalecloud.resetChat", () => {
            sharedChatServiceImpl(logger).clearSession();
        }),
        vscode.commands.registerCommand("whalecloud.signInUp", () => {
            signIn();
        }),
        vscode.commands.registerCommand("whalecloud.signOut", () => {
            signOut();
        }),
        vscode.commands.registerCommand("whalecloud.configureApiKey", () => {
            vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "whalecloud.devCloudAccessToken"
            );
        }),
        vscode.commands.registerCommand("whalecloud.generateProject", () => {
            handleGenerateProjectCommand();
        }),
        getScratchpadManager().registerTextDocumentContentProvider(),
        vscode.window.registerWebviewViewProvider(
            ChatPanelProvider.viewType,
            new ChatPanelProvider(context,logger)
        ),
        
    );

    // ---------------------begin huggingface
    void initStartup(context);
    

    // ----------------------end huggingface


}

export function deactivate() {
    const globalState = getGlobalState();
    globalState.activeSession?.dispose();
    globalState.activeSession = null;
    globalState.storage = null;
}
