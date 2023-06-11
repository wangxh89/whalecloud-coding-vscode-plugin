import * as vscode from "vscode";
import axios from "axios";
import { IChatService, CHAT_SERVICE_NAME } from "../../common/chatService";
import { MessageItemModel } from "../../common/chatService/model";
import { SelectionRange } from "../generate/core";
import { chat, resetChat } from "./core";
import { getCustomModelConfiguration } from "../utils";
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

    #updateHtmlMessage(msgId: string, contents: string, title: string, originUrl:string) {
        const msg = this.#messageIndex.get(msgId);
        if (!msg) {
            return;
        }

        msg.contents = contents;
        msg.isHtml = true;
        msg.title = title;
        msg.originUrl = originUrl;

        for (const client of this.#clients) {
            client.handleMessageChange?.call(client, msg);
        }
    }    

    getActiveEditorSelectText():Promise<string>{
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return Promise.resolve("");
        }        
        const { document, selection } = editor;

        const selectText = document.getText(selection);
        return Promise.resolve(selectText);
    }

    async searchRepo(prompt: string): Promise<void> {
        const param = JSON.parse(prompt);
        this.#addMessage({
            id: "",
            contents: param.keyword,
        });
        // const replyMsgId = this.#addMessage({
        //     id: "",
        //     contents: "",
        //     isReply: true,
        // });
        const customModelConfig = getCustomModelConfiguration();  
        const that = this;        
        if(param.searchType === 'doc') {
            try {
                let config = {
                    method: 'post',
                    url: 'https://dev.iwhalecloud.com/portal/zcm-doc/ide/search',
                    headers: { 
                      'token': customModelConfig?.openaiAPIKey || null, 
                      'Content-Type': 'application/json'
                    },
                    data : param
                  };                
                const result = await axios.request(config);
                
                console.log('searchRepo------------' , result.data); 
                if (result.data.data.length > 0) {
                    for( const msg of result.data.data) {
                        that.#addMessage({
                            id:"", 
                            contents: msg.content as string, 
                            title: msg.title as string, 
                            originUrl: msg.originUrl as string,
                            isReply: true,
                            isHtml: true,
                            isFinished:true
                        });
                    }   
                } else {
                    that.#addMessage({
                        id:"", 
                        contents: `在研发云文档库中，没有搜索到 \`${param.keyword}\` 的相关记录`, 
                        isReply: true,
                        isHtml: false,
                        isFinished:true
                    });                    
                }
               } catch (error) {
                console.log(error);
              }           
        } 
        else if(param.searchType === 'code') {
            try {
                let config = {
                    method: 'post',
                    url: 'https://dev.iwhalecloud.com/portal/zcm-doc/ide/search',
                    headers: { 
                      'token': customModelConfig?.openaiAPIKey || null, 
                      'Content-Type': 'application/json'
                    },
                    data : param
                  };                
                const result = await axios.request(config);
                
                console.log('searchRepo------------' , result.data); 
                if (result.data.data.length > 0) {
                    for( const msg of result.data.data) {
                        // 1. 取出 "title": "bindAggregatedPort - LocalTrsByUtnService.java", 的语言
                        const title = msg.title as string;

                        const ext = title.substring(title.indexOf(".") + 1);
                        const content = "### " + msg.title + " \r\n ```" + ext + "\r\n" +  msg.content + "\r\n ```";
                        console.warn("searchRepo code :", content);
                        that.#addMessage({
                            id:"", 
                            contents: content, 
                            isReply: true,
                            isHtml: false,
                            isFinished:true
                        });
                    }   
                } else {
                    that.#addMessage({
                        id:"", 
                        contents: `在研发云代码库中，没有搜索到 \`${param.keyword}\` 的相关记录`, 
                        isReply: true,
                        isHtml: false,
                        isFinished:true
                    }); 
                }
               } catch (error) {
                console.log(error);
              }           
        } 
    }

    async generateCode(prompt: string): Promise<void> {
        // Get the current editor and selection.
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showWarningMessage(
                "在生成代码之前，您必须激活编辑器。"
            );
            throw new Error("No active editor");
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
        let document:vscode.TextDocument;
        let selectionRange:SelectionRange = new SelectionRange(0,0); 
        if (editor) {
            document = editor.document;
            const selection = editor.selection
            const selectionStartOffset = document.offsetAt(selection.start);
            const selectionEndOffset = document.offsetAt(selection.end);
            selectionRange = new SelectionRange(
                selectionStartOffset,
                selectionEndOffset - selectionStartOffset
            );
        }

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
                title: "结果生成中...，点击取消",
                cancellable: true,
            },
            async (_progress, token) => {
                const abortController = new AbortController();
                token.onCancellationRequested(() => {
                    abortController.abort();
                    that.#updateMessage(replyMsgId, "", true);
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
                        "\n(请求失败，请检查 1. ZCM Key是否填写正确 2. 至dev.iwhalecloud.com 网络连接是否联通 3.重启下vscode(防止配置没有生效) ",
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
