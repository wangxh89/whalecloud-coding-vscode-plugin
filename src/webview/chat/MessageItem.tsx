import * as React from "react";
import ReactMarkdown from "react-markdown";
import { useRef} from "react";

import RemarkMath from "remark-math";
import RemarkBreaks from "remark-breaks";
import RehypeKatex from "rehype-katex";
import RemarkGfm from "remark-gfm";
import RehypeHighlight from "rehype-highlight";

import { MessageItemModel } from "../../common/chatService/model";
import { IndeterminateProgressBar } from "./IndeterminateProgressBar";
import { getServiceManager } from "../../common/ipc/webview";
import { IChatService, CHAT_SERVICE_NAME } from "../../common/chatService";


export interface MessageItemProps {
    model: MessageItemModel;
}

export function MessageItem(props: MessageItemProps) {
    const { model } = props;
    const { contents, isReply, isFinished } = model;
    return (
        <div className={`chat-msg ${isReply ? "reply" : ""}`}>
            <div className="chat-msg-contents">
                <MessageTextView
                    contents={
                        contents + (isReply && !isFinished ? "\u{258A}" : "")
                    }
                />
            </div>
            {isReply && !isFinished ? <IndeterminateProgressBar /> : null}
        </div>
    );
}

export function PreCode(props: { children: any }) {
    const ref = useRef<HTMLPreElement>(null);
    const handleCopyAction = (code: string) => {
        navigator.clipboard.writeText(code);
    };
    const handleInsertCodeSnippetAction = async (code: string) => {
        const chatService = await getServiceManager().getService<IChatService>(
            CHAT_SERVICE_NAME
        );
        await chatService.insertCodeSnippet(code);
    };
    return (
      <pre ref={ref}>
        <div className="action-btns">
            <span
            className="codicon codicon-copy action-code-button"
            title="Copy"
            onClick={() => {
                if (ref.current) {
                  const code = ref.current.innerText;
                  handleCopyAction(code);
                }}
            }>
            </span>
            <span
            className="codicon codicon-insert action-code-button"
            title="Insert Or Replace"
            onClick={() => {
                if (ref.current) {
                  const code = ref.current.innerText;
                  handleInsertCodeSnippetAction(code);
                }}
            }
            ></span>
        </div>
        {props.children}
      </pre>
    );
}

interface MessageTextViewProps {
    contents: string;
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
                    detect: false,
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
