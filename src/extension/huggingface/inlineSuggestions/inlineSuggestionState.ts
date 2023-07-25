import { commands } from "vscode";
import { AutocompleteResult, ResultEntry } from "../binary/requests/requests";


type Iterator = {
    next: () => number;
    prev: () => number;
    current: () => number;
  };
  
function rotate(value: number): Iterator {
    let current = 0;
    return {
      next() {
        current += 1;
        if (current > value) {
          current = 0;
        }
        return current;
      },
      prev() {
        current -= 1;
        if (current < 0) {
          current = value;
        }
        return current;
      },
      current() {
        return current;
      },
    };
  }
  


let autocompleteResult: AutocompleteResult | undefined | null;
let iterator = rotate(0);

export async function setSuggestionsState(
  autocompleteResults: AutocompleteResult | undefined | null
): Promise<void> {
  autocompleteResult = autocompleteResults;

  if (autocompleteResult?.results?.length) {
    iterator = rotate(autocompleteResult.results.length - 1);
    await toggleInlineState(true);
  } else {
    iterator = rotate(0);
    await toggleInlineState(false);
  }
}
export async function clearState(): Promise<void> {
  autocompleteResult = null;
  iterator = rotate(0);

  await toggleInlineState(false);
}
async function toggleInlineState(withinSuggestion: boolean): Promise<void> {
  await commands.executeCommand(
    "setContext",
    "whalecloud.in-inline-suggestions",
    withinSuggestion
  );
}

export function getNextSuggestion(): ResultEntry | undefined {
  return results()?.[iterator.next()];
}

export function getPrevSuggestion(): ResultEntry | undefined {
  return results()?.[iterator.prev()];
}

export function getCurrentSuggestion(): ResultEntry | undefined {
  return results()?.[iterator.current()];
}

export function getCurrentPrefix(): string {
  return autocompleteResult?.old_prefix || "";
}

export function getAllSuggestions(): ResultEntry[] | undefined {
  return results();
}

function results(): ResultEntry[] | undefined {
  return autocompleteResult?.results;
}
