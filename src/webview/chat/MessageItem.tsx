import * as React from "react";
import ReactMarkdown from "react-markdown";
import { useRef} from "react";

import RemarkMath from "remark-math";
import RemarkBreaks from "remark-breaks";
import RehypeKatex from "rehype-katex";
import RemarkGfm from "remark-gfm";
import RehypeHighlight from "rehype-highlight";
import { showToast } from "../component/ui-lib";
import { MessageItemModel } from "../../common/chatService/model";
import { IndeterminateProgressBar } from "./IndeterminateProgressBar";
import { getServiceManager } from "../../common/ipc/webview";
import { IChatService, CHAT_SERVICE_NAME } from "../../common/chatService";


export interface MessageItemProps {
    model: MessageItemModel;
}

export function MessageItem(props: MessageItemProps) {
    const { model } = props;
    const { contents, isReply, isFinished, isHtml, title, originUrl } = model;
    return (
        <div className={`chat-msg ${isReply ? "reply" : ""}`}>
            <div className="chat-msg-contents">
                {isHtml ?
                 <MessageHtmlView                   
                     contents={contents} title={title} originUrl={originUrl} /> 
                : <MessageTextView
                    contents={
                        contents + (isReply && !isFinished ? "\u{258A}" : "")
                    }
                />}
            </div>
            {isReply && !isFinished ? <IndeterminateProgressBar /> : null}
        </div>
    );
}

export function PreCode(props: { children: any }) {
    const ref = useRef<HTMLPreElement>(null);
    const handleCopyAction = (code: string) => {
        const insertText = "Insert\n"
        const cpText = code.substring(code.indexOf(insertText)+insertText.length);
        navigator.clipboard.writeText(cpText);
        showToast("已复制到剪贴板中");
    };
    const handleInsertCodeSnippetAction = async (code: string) => {
        const insertText = "Insert\n"
        const insertCode = code.substring(code.indexOf(insertText)+insertText.length);        
        const chatService = await getServiceManager().getService<IChatService>(
            CHAT_SERVICE_NAME
        );
        await chatService.insertCodeSnippet(insertCode);
    };
    return (
      <pre ref={ref}>
        <div className="action-btns">
                <span
                className="codicon codicon-copy action-code-button"
                style={{fontSize: "12px"}}
                title="Copy"
                onClick={() => {
                    if (ref.current) {
                    const code = ref.current.innerText;
                    console.log("action-btns--------------",code)
                    handleCopyAction(code);
                    }}
                }>Copy
                </span>
                <span
                className="codicon codicon-insert action-code-button"
                style={{fontSize: "12px"}}
                title="Insert Or Replace"
                onClick={() => {
                    if (ref.current) {
                    const code = ref.current.innerText;
                    console.log("action-btns----------------",code);
                    handleInsertCodeSnippetAction(code);
                    }}
                }
                >Insert</span>
            </div>         
        {props.children}
      </pre>
    );
}

interface MessageTextViewProps {
    contents: string;
    title?: string;
    originUrl?: string;
}

function MessageTextView(props: MessageTextViewProps) {
    const { contents } = props;
    return (
        <div className="markdown-body">
            <ReactMarkdown
                remarkPlugins={[RemarkMath, RemarkGfm, RemarkBreaks]}
                rehypePlugins={[
                RehypeKatex,
                [
                    RehypeHighlight,
                    {
                    detect: true,
                    ignoreMissing: true,
                    },
                ],
                ]}
                components={{
                    pre: PreCode,
                }}
            >
            {contents}
            </ReactMarkdown>
        </div>
    );
}


function MessageHtmlView(props: MessageTextViewProps) {
    const { contents, title = "", originUrl="javascript:void" } = props;

    return (
        <div className="html-content">
            <div className="title-header">
                <a href={originUrl} target="_blank" className="title-header-a" dangerouslySetInnerHTML={{ __html: title }} >
                </a>
            </div>

            <span dangerouslySetInnerHTML={{ __html: contents }}   />        
        </div>
    );
}
