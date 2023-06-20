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
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
    const [selectText, setSelectText] = useState("");
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

    const setSelectTextAction = useCallback((selectText:string) => {
        console.warn("setSelectTextAction-------",  selectText)
        setSelectText(selectText);
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
        setHasSelection(false);
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
        setHasSelection(false);        
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
        const param = {
            "keyword": prompt, // 搜索内容            
            "page": "0", // 页数           
            "pageSize": "10", // 每页数据           
            "projectCode": "", // 项目ID            
            "scope": "inner", // 内网数据或者外网数据，现在只支持搜索内网数据            
            "searchType": "code", // 搜索doc或者code            
            };
            
            await chatService.searchRepo(JSON.stringify(param));
            
            setPrompt("");                 
    }, [prompt, setPrompt, setMessages]);
   
    const handleRepoDocAction = useCallback(async () => {
        const chatService = await getServiceManager().getService<IChatService>(
            CHAT_SERVICE_NAME
        );   
            
            const param = {
            "keyword": prompt, // 搜索内容            
            "page": "0", // 页数           
            "pageSize": "10", // 每页数据           
            "projectCode": "", // 项目ID            
            "scope": "inner", // 内网数据或者外网数据，现在只支持搜索内网数据            
            "searchType": "doc", // 搜索doc或者code            
            };
            
            await chatService.searchRepo(JSON.stringify(param));
            
            setPrompt("");          
    }, [prompt, setPrompt, setMessages]);    

    const confirmShortcut = useConfirmShortcut(handleAskAction);

    const confirmGenVar = useConfirmShortcut(handleGenVarAction);

    const confirmGenCode = useConfirmShortcut(handleGenCodeAction);


    const repoKeyhandler = () => {};

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
        viewServiceImpl.setSelectTextAction = setSelectTextAction;
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

                <VSCodePanelView id="AI" >
                    <div style={{display:"flex",  width:"100%", flexDirection: "column"}}>
                        { hasSelection ?
                            <div className="chat-select-text-float">
                                <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    codeTagProps={{ style: {maxHeight: "200px"} }}
                                    language="javascript"
                                    customStyle={{ background:"#1a1b26", color: "#cbd2ea"}}
                                >
                                    {selectText}
                                </SyntaxHighlighter>
                                <span role="img" aria-label="close-circle" className="chat-select-text-close clickable" onClick={() => setHasSelection(false)}>
                                    <svg viewBox="64 64 896 896" focusable="false" data-icon="close-circle" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                                        <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66-.3L512 563.4l-99.3 118.4-66.1.3c-4.4 0-8-3.5-8-8 0-1.9.7-3.7 1.9-5.2l130.1-155L340.5 359a8.32 8.32 0 01-1.9-5.2c0-4.4 3.6-8 8-8l66.1.3L512 464.6l99.3-118.4 66-.3c4.4 0 8 3.5 8 8 0 1.9-.7 3.7-1.9 5.2L553.5 514l130 155c1.2 1.5 1.9 3.3 1.9 5.2 0 4.4-3.6 8-8 8z">
                                        </path>
                                    </svg>
                                </span>
                            </div>  : null        
                        }
                        <div style={{display:"flex", width:"100%"}}>
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
                                    <span>测</span>
                                </div>
                                <div className="chat-input-action clickable" title="转Unicode" onClick={() => handleCustom('transform Unicode')}>
                                    <span>码</span>
                                </div>
                                <div className="chat-input-action clickable" title="添加中文注释" onClick={() => handleCustom('add Chinese code comment')}>
                                    <span>注</span>
                                </div>
                                <div className="chat-input-action clickable" title="代码重构" onClick={() => handleCustom('do code refactoring')}>
                                    <span>构</span>
                                    </div>
                                <div className="chat-input-action clickable" title="代码解释" onClick={() => handleCustom('interpretive code')}>
                                    <span>释</span>
                                </div>
                                <div className="chat-input-action clickable" title="翻译成中文" onClick={() => handleCustom('translate into Chinese')}>
                                    <span>译</span>
                                </div>
                                <div className="chat-input-action clickable" title="正则表达式" onClick={() => handleCustom('write regular expressions')}>
                                    <span>则</span>
                                </div>
                                <div className="chat-input-action clickable" title="问题分析" onClick={() => handleCustom('analysis')}>
                                    <span>析</span>
                                </div>
                                <div className="chat-input-action clickable" title="代码示例" onClick={() => handleCustom('add code example')}>
                                    <span>例</span>
                                </div>
                            </div>
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
                            onKeyDown={repoKeyhandler}
                        />
                        <div style={{display:"flex", flexDirection:"row", justifyContent:"flex-end", gap:"20px" ,width:"100%"}}>
                        <VSCodeButton
                                disabled={!isReady || prompt.length === 0}
                                onClick={handleRepoDocAction}
                            >
                                {'文档库搜索'}
                            </VSCodeButton>       

                            <VSCodeButton
                                disabled={!isReady || prompt.length === 0}
                                onClick={handleRepoCodeAction}
                            >
                                {'代码库搜索'}
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
                            onKeyDown={confirmGenVar.keyDownHandler}
                        />
                        <VSCodeButton
                            disabled={!isReady || prompt.length === 0}
                            onClick={handleGenVarAction}
                        >
                            {`生成变量名 (${confirmGenVar.label})`}
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
                            onKeyDown={confirmGenCode.keyDownHandler}
                        />
                        <VSCodeButton
                            disabled={!isReady || prompt.length === 0}
                            onClick={handleGenCodeAction}
                        >
                            {`生成、修改代码 (${confirmGenCode.label})`}
                        </VSCodeButton>
                    </div>
                </VSCodePanelView>                                                
            </VSCodePanels>
        </div>
    );
}
