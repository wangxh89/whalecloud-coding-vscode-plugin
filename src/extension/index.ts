import * as vscode from "vscode";
import * as crypto from "crypto";
import axios from "axios";
import { simpleGit} from 'simple-git';
import { setTabnineExtensionContext } from "./huggingface/globals/tabnineExtensionContext";


import { GenerateSession, getScratchpadManager } from "./generate";
import { getGlobalState } from "./globalState";
import { ChatPanelProvider } from "./chat/chatPanelProvider";
import { sharedChatServiceImpl } from "./chat/chatServiceImpl";
import { setExtensionContext, signIn, signOut } from "@crates/cursor-core";
import { ExtensionContext } from "./context";
import { handleGenerateProjectCommand } from "./project";

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



interface GitUrlParts {
    gitHost: string;
    orgName: string;
    repoName: string;
  }
  
  function splitGitUrl(url: string): GitUrlParts | null {
    let giturl = url;
    // 1. 规整像 ssh://git@git-nj.iwhalecloud.com:52422/ossr9dev/rc-public-capability-product.git 这样的git地址
    if (url.startsWith('ssh://')) {
        giturl = url.replace('ssh://','');        
    } 

    const regex = /^(?:https?|git)(?::\/\/|@)([^\/]+)[\/:]([^\/]+)\/(.+?)(?:\.git)?$/;
    const matches = giturl.match(regex);
  
    if (matches) {
      let gitHost = matches[1];
      const orgName = matches[2];
      const repoName = matches[3];
      
      // 2. 规整 git-nj.iwhalecloud.com:52422 这种情况
      if (gitHost.indexOf(':') !== -1) {
        gitHost = gitHost.replace(/:\d+$/, "");
      }
      return {
        gitHost,
        orgName,
        repoName
      };
    } else {
      return null; // 无效的 git 地址
    }
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
          //vscode.window.showErrorMessage('Failed to get git remote url.');
          console.error(err);
          return;
        }
  
        const remoteUrl = remotes[0].refs.fetch;
        getGlobalState().remoteUrl = remoteUrl;

        // vscode.window.showWarningMessage('Git remote url: ' + remoteUrl);

        const result = splitGitUrl(remoteUrl);

        if (result) {
            let data = JSON.stringify({
                "git_host": result.gitHost,
                "org_name": result.orgName,
                "repo_name": result.repoName
            });

            console.log("git.getRemotes1.0---", data)
        
            let config = {
                method: 'post',
                url: 'https://dev.iwhalecloud.com/faas/serverless/codingplus/high-risk',
                headers: { 
                    'content-type': 'application/json'
                },
                data : data
            };

            console.log("git.getRemotes2.0---", config)
    
            axios.request(config).then((response) => {
                console.log("git.getRemotes3.0---",  JSON.stringify(response.data));
              const data = response.data;
              if (data.rule_list) {
                    getGlobalState().ruleList =  data.rule_list;
              } 
            })
            .catch((error) => {
                console.log("git.getRemotes4.0---",error);
            });
        }

      });    

    //   codingplus 获取高风险文件的接口 ： 
    //   curl --request POST \
    //     --url https://dev.iwhalecloud.com/faas/serverless/codingplus/high-risk \
    //     --header 'content-type: application/json' \
    //     --data '{
    //     "git_host": "git-nj.iwhalecloud.com",
    //     "org_name": "bss3",
    //     "repo_name": "bss_pos_core"
    //   }'


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

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => {
            //  vscode.window.showInformationMessage('Opened document: ' + document.fileName);
            // 判断是否是高风险  
            getGlobalState().ruleList.forEach(element => {
                if (document.fileName.indexOf(element.file_path) !== -1) {
                    let strMsg = '该代码文件为风险代码，修改需谨慎！';
                    if (element.comments && element.comments.length > 0) {
                        strMsg = '该代码文件为风险代码，修改需谨慎！原因：' + element.comments 
                    }
                    vscode.window.showWarningMessage(strMsg);
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
            sharedChatServiceImpl().clearSession();
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
            new ChatPanelProvider(context)
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

async function getRemoteUrl() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder found.');
      return;
    }

    const workspaceFolder = workspaceFolders[0];
    const workspaceFolderPath = workspaceFolder.uri.fsPath;

    const git = simpleGit(workspaceFolderPath);
    try {
      const remotes = await git.getRemotes(true);
      const remoteUrl = remotes[0].refs.fetch;
      vscode.window.showWarningMessage('Git remote url: ' + remoteUrl);
    } catch (err) {
      vscode.window.showErrorMessage('Failed to get git remote url.');
      console.error(err);
    }
}
