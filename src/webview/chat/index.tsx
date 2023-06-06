import * as React from "react";
import {
    useState,
    useEffect,
    useLayoutEffect,
    useCallback,
    useRef,
    useMemo,
} from "react";
import { VSCodeButton, VSCodeTextArea, VSCodePanels, VSCodePanelTab, VSCodePanelView } from "@vscode/webview-ui-toolkit/react";

import "./style.css";
import { MessageItem } from "./MessageItem";
import { ChatViewServiceImpl } from "./chatViewServiceImpl";
import { getServiceManager } from "../../common/ipc/webview";
import { IChatService, CHAT_SERVICE_NAME } from "../../common/chatService";
import { MessageItemModel } from "../../common/chatService/model";

function messagesWithUpdatedBotMessage(
    msgs: MessageItemModel[],
    updatedMsg: MessageItemModel
): MessageItemModel[] {
    return msgs.map((msg) => {
        if (updatedMsg.id === msg.id) {
            return updatedMsg;
        }
        return msg;
    });
}

type UseConfirmShortcut = {
    label: string;
    keyDownHandler: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};
function useConfirmShortcut(handler: () => void): UseConfirmShortcut {
    const isMac = useMemo(() => {
        const userAgentData = (window.navigator as any).userAgentData;
        if (userAgentData) {
            return userAgentData.platform === "macOS";
        }
        return window.navigator.platform === "MacIntel";
    }, []);

    return {
        label: isMac ? "⌘⏎" : "Ctrl+Enter",
        keyDownHandler: useCallback(
            (e) => {
                if (e.key !== "Enter") {
                    return;
                }
                const expected = isMac ? e.metaKey : e.ctrlKey;
                const unexpected = isMac ? e.ctrlKey : e.metaKey;
                if (!expected || e.altKey || e.shiftKey || unexpected) {
                    return;
                }
                handler();
            },
            [isMac, handler]
        ),
    };
}

const AUTO_SCROLL_FLAG_NONE = 0;
const AUTO_SCROLL_FLAG_FORCED = 1;
const AUTO_SCROLL_FLAG_AUTOMATIC = 2;

export function ChatPage() {
    const [messages, setMessages] = useState([] as MessageItemModel[]);
    const [hasSelection, setHasSelection] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [prompt, setPrompt] = useState("");
    // const [contextSelect, setContextSelect] = useState('');
    const [autoScrollFlag, setAutoScrollFlag] = useState(AUTO_SCROLL_FLAG_NONE);
    const chatListRef = useRef<HTMLDivElement>(null);

    // Dependent on `setMessages`, which will never change.
    const addMessageAction = useCallback((msg: MessageItemModel) => {
        setMessages((prev) => {
            return [...prev, msg];
        });
        setAutoScrollFlag(AUTO_SCROLL_FLAG_FORCED);
    }, []);
    const updateMessageAction = useCallback((msg: MessageItemModel) => {
        setMessages((prev) => {
            return messagesWithUpdatedBotMessage(prev, msg);
        });
        setAutoScrollFlag(AUTO_SCROLL_FLAG_AUTOMATIC);
    }, []);
    const clearMessageAction = useCallback(() => {
        setMessages([]);
    }, []);

    // const contextIfSelect = async () => {
    //     const context = selectContext();
    //     if (context) {
    //         setContextSelect(context);
    //     }
    // };


    const handleAskAction = useCallback(async () => {
        const chatService = await getServiceManager().getService<IChatService>(
            CHAT_SERVICE_NAME
        );
        await chatService.confirmPrompt(prompt, "Freeform");
        setPrompt("");
    }, [prompt, setPrompt, setMessages]);


    const handleCustom = useCallback(async (require: String) => {
        const chatService = await getServiceManager().getService<IChatService>(
            CHAT_SERVICE_NAME
        );  
        let retPrompt = prompt; 
        if (prompt.trim() === "") {
            retPrompt = await chatService.getActiveEditorSelectText();
            console.log("----------------------------------", retPrompt);
        }

        const strPrompt = `你是一个中文助手，请用中文回答我所有问题。 Can you ${require} for this code? ${retPrompt}`;
        await chatService.confirmPrompt(strPrompt, "Custom");
        setPrompt("");
        // setContextSelect('');            
    }, [prompt, setPrompt, setMessages]);

    const handleGenVarAction = useCallback(async () => {
        const chatService = await getServiceManager().getService<IChatService>(
            CHAT_SERVICE_NAME
        );   
        await chatService.confirmPrompt(prompt, "GenVar");
        setPrompt("");          
    }, [prompt, setPrompt, setMessages]);
    
    const handleGenCodeAction = useCallback(async () => {
        const chatService = await getServiceManager().getService<IChatService>(
            CHAT_SERVICE_NAME
        );   
        await chatService.generateCode(prompt);
        setPrompt("");          
    }, [prompt, setPrompt, setMessages]);

    const handleRepoCodeAction = useCallback(async () => {
        const chatService = await getServiceManager().getService<IChatService>(
            CHAT_SERVICE_NAME
        );   
        await chatService.generateCode(prompt);
        setPrompt("");          
    }, [prompt, setPrompt, setMessages]);
   
    const handleRepoDocAction = useCallback(async () => {
        const chatService = await getServiceManager().getService<IChatService>(
            CHAT_SERVICE_NAME
        );   
        await chatService.generateCode(prompt);
        setPrompt("");          
    }, [prompt, setPrompt, setMessages]);    

    const confirmShortcut = useConfirmShortcut(handleAskAction);

    useLayoutEffect(() => {
        if (!autoScrollFlag) {
            return;
        }
        const chatListEl = chatListRef.current;
        if (!chatListEl) {
            return;
        }

        setAutoScrollFlag(AUTO_SCROLL_FLAG_NONE);

        const targetScrollTop =
            chatListEl.scrollHeight - chatListEl.clientHeight;
        // TODO: implement `AUTO_SCROLL_FLAG_AUTOMATIC` flag.
        chatListEl.scrollTop = targetScrollTop;
    }, [messages, autoScrollFlag, setAutoScrollFlag, chatListRef]);

    useEffect(() => {
        const serviceManager = getServiceManager();

        const viewServiceImpl = new ChatViewServiceImpl();
        viewServiceImpl.setIsReadyAction = setIsReady;
        viewServiceImpl.setHasSelectionAction = setHasSelection;
        viewServiceImpl.addMessageAction = addMessageAction;
        viewServiceImpl.updateMessageAction = updateMessageAction;
        viewServiceImpl.clearMessageAction = clearMessageAction;
        serviceManager.registerService(viewServiceImpl);

        serviceManager
            .getService<IChatService>(CHAT_SERVICE_NAME)
            .then((chatService) => {
                chatService.syncState();
            });
        // contextIfSelect();
    }, []);

    return (
        <div className="chat-root">
            <div ref={chatListRef} className="chat-list">
                {messages.map((m) => {
                    return <MessageItem key={m.id} model={m} />;
                })}
            </div>
            
            <VSCodePanels>
                <VSCodePanelTab id="AI">问答</VSCodePanelTab>
                <VSCodePanelTab id="search">搜索</VSCodePanelTab>
                <VSCodePanelTab id="genVar">命名</VSCodePanelTab>
                <VSCodePanelTab id="genCode">代码辅助</VSCodePanelTab>                

                <VSCodePanelView id="AI">
                    <div className="chat-input-area chat-input-area-ai">
                        <VSCodeTextArea
                            rows={3}
                            placeholder={`Talk about the ${
                                hasSelection ? "selected contents" : "whole document"
                            }...`}
                            disabled={!isReady}
                            value={prompt}
                            onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                setPrompt(e.target.value);
                            }}
                            onKeyDown={confirmShortcut.keyDownHandler}
                        />
                        <VSCodeButton
                            disabled={!isReady || prompt.length === 0}
                            onClick={handleAskAction}
                        >
                            {`提问 (${confirmShortcut.label})`}
                        </VSCodeButton>
                    </div>
                    <div className="chat-icon-area">
                        <div className="chat-input-action clickable" title="单元测试" onClick={() => handleCustom('add unit tests')}>
                            <span className="codicon codicon-inspect"></span>
                        </div>
                        <div className="chat-input-action clickable" title="转Unicode" onClick={() => handleCustom('transform Unicode')}>
                            <span className="codicon codicon-file-binary"></span>
                        </div>
                        <div className="chat-input-action clickable" title="添加中文注释" onClick={() => handleCustom('add Chinese code comment')}>
                            <span className="codicon codicon-person-add"></span>
                        </div>
                        <div className="chat-input-action clickable" title="代码重构" onClick={() => handleCustom('do code refactoring')}>
                            <span className="codicon codicon-debug-restart-frame"></span>
                            </div>
                        <div className="chat-input-action clickable" title="代码解释" onClick={() => handleCustom('interpretive code')}>
                            <span className="codicon codicon-question"></span>
                        </div>
                        <div className="chat-input-action clickable" title="翻译成中文" onClick={() => handleCustom('translate into Chinese')}>
                            <span className="codicon codicon-preserve-case"></span>
                        </div>
                        <div className="chat-input-action clickable" title="正则表达式" onClick={() => handleCustom('write regular expressions')}>
                            <span className="codicon codicon-regex"></span>
                        </div>
                        <div className="chat-input-action clickable" title="问题分析" onClick={() => handleCustom('analysis')}>
                            <span className="codicon codicon-debug-console"></span>
                        </div>
                        <div className="chat-input-action clickable" title="代码示例" onClick={() => handleCustom('add code example')}>
                            <span className="codicon codicon-eye"></span>
                        </div>
                    </div>
                </VSCodePanelView>

                <VSCodePanelView id="search">
                    <div className="chat-input-area">
                        <VSCodeTextArea
                            style={{ width: "100%" }}
                            rows={3}
                            placeholder={`云雀研发云文档库、代码库进行搜索...`}
                            disabled={!isReady}
                            value={prompt}
                            onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                setPrompt(e.target.value);
                            }}
                            onKeyDown={confirmShortcut.keyDownHandler}
                        />
                        <div style={{display:"flex", flexDirection:"row", justifyContent:"flex-end", gap:"20px" ,width:"100%"}}>
                            <VSCodeButton
                                disabled={!isReady || prompt.length === 0}
                                onClick={handleRepoCodeAction}
                            >
                                {'代码库搜索'}
                            </VSCodeButton>
                            <VSCodeButton
                                disabled={!isReady || prompt.length === 0}
                                onClick={handleRepoDocAction}
                            >
                                {'文档库搜索'}
                            </VSCodeButton>                            
                        </div>
                    </div>
                </VSCodePanelView>     

                <VSCodePanelView id="genVar">
                    <div className="chat-input-area">
                        <VSCodeTextArea
                            style={{ width: "100%" }}
                            rows={3}
                            placeholder={`请输入要生成的变量名提示语`}
                            disabled={!isReady}
                            value={prompt}
                            onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                setPrompt(e.target.value);
                            }}
                            onKeyDown={confirmShortcut.keyDownHandler}
                        />
                        <VSCodeButton
                            disabled={!isReady || prompt.length === 0}
                            onClick={handleGenVarAction}
                        >
                            {`生成变量名`}
                        </VSCodeButton>
                    </div>
                </VSCodePanelView>     
                
                <VSCodePanelView id="genCode">
                    <div className="chat-input-area">
                        <VSCodeTextArea
                            style={{ width: "100%" }}
                            rows={3}
                            placeholder={`请选中右侧编辑器代码，输入要修改的提示语。或者直接输入要生成的代码提示语,`}
                            disabled={!isReady}
                            value={prompt}
                            onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                setPrompt(e.target.value);
                            }}
                            onKeyDown={confirmShortcut.keyDownHandler}
                        />
                        <VSCodeButton
                            disabled={!isReady || prompt.length === 0}
                            onClick={handleGenCodeAction}
                        >
                            {`生成、修改代码`}
                        </VSCodeButton>
                    </div>
                </VSCodePanelView>                                                
            </VSCodePanels>
        </div>
    );
}
