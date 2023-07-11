import { Memento } from "vscode";
import { GenerateSession } from "./generate";

interface rule {
    file_type: string;
    file_path: string;
    comments: string;
}
interface GlobalState {
    activeSession: GenerateSession | null;
    storage: Memento | null;
    remoteUrl: string | null;
    ruleList: Array<rule>;
}

const globalState: GlobalState = {
    activeSession: null,
    storage: null,
    remoteUrl: null,
    ruleList: [],
};

export function getGlobalState() {
    return globalState;
}
