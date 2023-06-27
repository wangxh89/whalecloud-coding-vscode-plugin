export interface MessageItemModel {
    id: string;
    contents: string;
    isReply?: boolean;
    isFinished?: boolean;
    isHtml?: boolean;
    title?: string;
    originUrl?: string;

}
export interface ConfirmPromptModel {
    prompt: string, 
    msgType: string,
    displayMsg?:string
}
