import * as vscode from "vscode";

import { getNonce } from "../utils";
import { sharedChatServiceImpl, ChatServiceClient } from "./chatServiceImpl";
import { ExtensionHostServiceManager } from "../../common/ipc/extensionHost";
import {
    IChatViewService,
    CHAT_VIEW_SERVICE_NAME,
} from "../../common/chatService";
import { MessageItemModel } from "../../common/chatService/model";
import { Logger } from "../logger";

export class ChatPanelProvider
    implements vscode.WebviewViewProvider, ChatServiceClient
{
    static readonly viewType = "whalecloudchatview";

    #view: vscode.WebviewView | null = null;
    #logger:Logger;
    #extensionContext: vscode.ExtensionContext;
    #serviceManager: ExtensionHostServiceManager | null = null;

    constructor(extensionContext: vscode.ExtensionContext, logger:Logger) {
        this.#extensionContext = extensionContext;
        this.#logger = logger;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        this.#view = webviewView;

        const { extensionUri } = this.#extensionContext;
        const { webview } = webviewView;
        const baseUri = vscode.Uri.joinPath(extensionUri, "dist");
        webview.options = {
            enableScripts: true,
            localResourceRoots: [baseUri],
        };
        webview.html = ChatPanelProvider.#buildWebviewContents(
            webview,
            baseUri
        );

        const chatService = sharedChatServiceImpl(this.#logger);
        chatService.attachClient(this);

        const serviceManager = new ExtensionHostServiceManager(webview);
        serviceManager.registerService(chatService);
        this.#serviceManager = serviceManager;

        const eventDisposable = vscode.window.onDidChangeTextEditorSelection(
            async (e) => {
                const hasSelection = !e.selections[0].isEmpty;
                const chatViewService =
                    await serviceManager.getService<IChatViewService>(
                        CHAT_VIEW_SERVICE_NAME
                    );
                await chatViewService.setHasSelection(hasSelection);
                
                if (hasSelection) {
                    const selectText = e.textEditor.document.getText(e.selections[0]);
                    await chatViewService.setSelectText(selectText);
                } 
                
            }
        );

        webviewView.onDidDispose(() => {
            eventDisposable.dispose();
            serviceManager.dispose();
            chatService.detachClient(this);
        });
    }

    handleReadyStateChange(isReady: boolean): void {
        const serviceManager = this.#serviceManager;
        if (!serviceManager) {
            return;
        }

        serviceManager
            .getService<IChatViewService>(CHAT_VIEW_SERVICE_NAME)
            .then((service) => {
                service.setIsBusy(isReady);
            });
    }

    handleNewMessage(msg: MessageItemModel): void {
        const serviceManager = this.#serviceManager;
        if (!serviceManager) {
            return;
        }

        serviceManager
            .getService<IChatViewService>(CHAT_VIEW_SERVICE_NAME)
            .then((service) => {
                service.addMessage(msg);
            });
    }

    handleMessageChange(msg: MessageItemModel): void {
        const serviceManager = this.#serviceManager;
        if (!serviceManager) {
            return;
        }

        serviceManager
            .getService<IChatViewService>(CHAT_VIEW_SERVICE_NAME)
            .then((service) => {
                service.updateMessage(msg);
            });
    }

    handleClearMessage(): void {
        const serviceManager = this.#serviceManager;
        if (!serviceManager) {
            return;
        }

        serviceManager
            .getService<IChatViewService>(CHAT_VIEW_SERVICE_NAME)
            .then((service) => {
                service.clearMessage();
            });
    }

    static #buildWebviewContents(
        webview: vscode.Webview,
        baseUri: vscode.Uri
    ): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(baseUri, "webview.js")
        );
        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(baseUri, "codicon.css")
        );

        const icomoonUri = webview.asWebviewUri(
            vscode.Uri.joinPath(baseUri, "icomoon.css")
        );        
        const nonce = getNonce();

        return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline' ; script-src 'nonce-${nonce}';">
                <title>CodeCursor</title>
                <script nonce="${nonce}">
                    window.__codeCursorPageName = "whalecloudchatview";
                </script>
                <link href="${codiconsUri}" rel="stylesheet" />
                <link href="${icomoonUri}" rel="stylesheet" />
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
        </html>
        `;
    }
}
