import {
    IChatViewService,
    CHAT_VIEW_SERVICE_NAME,
} from "../../common/chatService";
import { MessageItemModel } from "../../common/chatService/model";

export class ChatViewServiceImpl implements IChatViewService {

    setIsReadyAction: ((isReady: boolean) => void) | null = null;
    setHasSelectionAction: ((hasSelection: boolean) => void) | null = null;
    setSelectTextAction: ((selectText: string) => void) | null = null;
    addMessageAction: ((msg: MessageItemModel) => void) | null = null;
    updateMessageAction: ((msg: MessageItemModel) => void) | null = null;
    clearMessageAction: (() => void) | null = null;

    get name(): string {
        return CHAT_VIEW_SERVICE_NAME;
    }

    async setIsBusy(isBusy: boolean): Promise<void> {
        this.setIsReadyAction?.call(null, isBusy);
    }

    async setHasSelection(hasSelection: boolean): Promise<void> {
        this.setHasSelectionAction?.call(null, hasSelection);
    }

    async setSelectText(selectText: string): Promise<void> {
        this.setSelectTextAction?.call(null, selectText);
    }    

    async addMessage(msg: MessageItemModel): Promise<void> {
        this.addMessageAction?.call(null, msg);
    }

    async updateMessage(msg: MessageItemModel): Promise<void> {
        this.updateMessageAction?.call(null, msg);
    }

    async clearMessage(): Promise<void> {
        this.clearMessageAction?.call(null);
    }
}
