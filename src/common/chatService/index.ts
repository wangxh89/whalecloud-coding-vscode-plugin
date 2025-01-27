import { IService } from "../ipc";
import { MessageItemModel, ConfirmPromptModel } from "./model";

export const CHAT_SERVICE_NAME = "whalecloudchatview";

export interface IChatService extends IService {
    confirmPrompt(confirmPrompt: ConfirmPromptModel): Promise<void>;
    syncState(): Promise<void>;
    insertCodeSnippet(contents: string): Promise<void>;
    generateCode(prompt: string): Promise<void>;
    getActiveEditorSelectText(): Promise<string>;
    searchRepo(prompt: string): Promise<void>;
}

export const CHAT_VIEW_SERVICE_NAME = "chat_view";

export interface IChatViewService extends IService {
    setIsBusy(isBusy: boolean): Promise<void>;
    setHasSelection(hasSelection: boolean): Promise<void>;
    setSelectText(selectText: string): Promise<void>;
    addMessage(msg: MessageItemModel): Promise<void>;
    updateMessage(msg: MessageItemModel): Promise<void>;
    clearMessage(): Promise<void>;
}
