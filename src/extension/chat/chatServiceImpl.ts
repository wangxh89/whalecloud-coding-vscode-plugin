import * as vscode from "vscode";

import { IChatService, CHAT_SERVICE_NAME } from "../../common/chatService";
import { MessageItemModel } from "../../common/chatService/model";
import { SelectionRange } from "../generate/core";
import { chat, resetChat } from "./core";
import { getGlobalState } from "../globalState";
import { GenerateSession } from "../generate";
export interface ChatServiceClient {
    handleReadyStateChange?: (isReady: boolean) => void;
    handleNewMessage?: (msg: MessageItemModel) => void;
    handleMessageChange?: (msg: MessageItemModel) => void;
    handleClearMessage?: () => void;
}

function setHasActiveGenerateSessionContext(value: boolean) {
    vscode.commands.executeCommand(
        "setContext",
        "whalecloud.hasActiveGenerateSession",
        value
    );
}


export class ChatServiceImpl implements IChatService {
    #currentMessageId = 0;
    #messages = new Array<MessageItemModel>();
    #messageIndex = new Map<string, MessageItemModel>();
    #clients = new Set<ChatServiceClient>();
    #currentAbortController: AbortController | null = null;
    #clearSessionScheduled = false;

    get name(): string {
        return CHAT_SERVICE_NAME;
    }

    attachClient(client: ChatServiceClient) {
        this.#clients.add(client);
    }

    detachClient(client: ChatServiceClient) {
        this.#clients.delete(client);

        if (this.#clients.size === 0) {
            // Abort the session when no clients connected.
            this.#currentAbortController?.abort();
            this.#currentAbortController = null;
        }
    }

    clearSession() {
        const abortController = this.#currentAbortController;
        if (abortController) {
            this.#clearSessionScheduled = true;
            abortController.abort();
            return;
        }

        resetChat();
        this.#messageIndex.clear();
        this.#messages.splice(0, this.#messages.length);
        for (const client of this.#clients) {
            client.handleClearMessage?.call(client);
        }
        this.#clearSessionScheduled = false;

        vscode.window.showInformationMessage("Chat session has been reset!");
    }

    #updateReadyState(isReady: boolean) {
        for (const client of this.#clients) {
            client.handleReadyStateChange?.call(client, isReady);
        }
    }

    #addMessage(msg: MessageItemModel): string {
        const id = ++this.#currentMessageId;
        msg.id = msg.isReply ? `bot:${id}` : `user:${id}`;
        this.#messages.push(msg);
        this.#messageIndex.set(msg.id, msg);

        for (const client of this.#clients) {
            client.handleNewMessage?.call(client, msg);
        }

        return msg.id;
    }

    #updateMessage(msgId: string, newContents: string, finished?: boolean) {
        const msg = this.#messageIndex.get(msgId);
        if (!msg) {
            return;
        }

        msg.contents += newContents;
        msg.isFinished = finished;

        for (const client of this.#clients) {
            client.handleMessageChange?.call(client, msg);
        }
    }

    async generateCode(prompt: string): Promise<void> {
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

        const session = new GenerateSession(prompt, editor);
        session.onDidDispose(() => {
            globalState.activeSession = null;
            setHasActiveGenerateSessionContext(false);
        });
        session.start();
        session.showResult();
        globalState.activeSession = session;
        setHasActiveGenerateSessionContext(true);        
    }

    async confirmPrompt(prompt: string, msgType: string): Promise<void> {
        if (this.#currentAbortController) {
            // TODO: optimize the UX.
            console.warn("A chat session is in-flight");
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage(
                "在聊天之前，您必须激活编辑器。"
            );
            throw new Error("No active editor");
        }

        const { document, selection } = editor;

        const selectionStartOffset = document.offsetAt(selection.start);
        const selectionEndOffset = document.offsetAt(selection.end);
        const selectionRange = new SelectionRange(
            selectionStartOffset,
            selectionEndOffset - selectionStartOffset
        );

        this.#addMessage({
            id: "",
            contents: prompt,
        });
        const replyMsgId = this.#addMessage({
            id: "",
            contents: "",
            isReply: true,
        });

        const that = this;
        const resultStream = {
            write(value: string) {
                that.#updateMessage(replyMsgId, value as string);
            },
            end() {
                that.#updateMessage(replyMsgId, "", true);
            },
        };

        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: "Generating reply...",
                cancellable: true,
            },
            async (_progress, token) => {
                const abortController = new AbortController();
                token.onCancellationRequested(() => {
                    abortController.abort();
                });
                this.#currentAbortController = abortController;
                this.#updateReadyState(false);

                try {
                    await chat(
                        prompt,
                        msgType,                        
                        document,
                        selectionRange,
                        abortController.signal,
                        resultStream
                    );
                } catch (e) {
                    console.error(e);
                    // TODO: optimize the display of error message.
                    this.#updateMessage(
                        replyMsgId,
                        "\n(请求失败，请检查 1. ZCM Key是否填写正确 2. 至dev.iwhalecloud.com 网络连接)",
                        true
                    );
                } finally {
                    this.#currentAbortController = null;
                    this.#updateReadyState(true);
                    if (this.#clearSessionScheduled) {
                        this.clearSession();
                    }
                }
            }
        );
    }

    async syncState(): Promise<void> {
        for (const msg of this.#messages) {
            for (const client of this.#clients) {
                client.handleNewMessage?.call(client, msg);
            }
        }

        const isReady = this.#currentAbortController === null;
        this.#updateReadyState(isReady);
    }

    async insertCodeSnippet(contents: string): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }

        await activeEditor.insertSnippet(
            new vscode.SnippetString().appendText(contents),
            activeEditor.selection
        );
    }
}

let shared: ChatServiceImpl | null = null;
export function sharedChatServiceImpl(): ChatServiceImpl {
    if (!shared) {
        shared = new ChatServiceImpl();
    }
    return shared;
}
