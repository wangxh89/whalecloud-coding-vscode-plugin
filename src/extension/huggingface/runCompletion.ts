import { Position, Range, TextDocument, WorkspaceConfiguration, workspace, window, env, Uri } from "vscode";
import {URL} from "url";
import axios from "axios";
import { AutocompleteResult, ResultEntry } from "./binary/requests/requests";
import { CHAR_LIMIT, FULL_BRAND_REPRESENTATION } from "./globals/consts";
import languages from "./globals/languages";
import { setDefaultStatus, setLoadingStatus } from "./statusBar/statusBar";
// import { logInput, logOutput } from "./outputChannels";
import { getTabnineExtensionContext, getLogger } from "./globals/tabnineExtensionContext";

export type CompletionType = "normal" | "snippet";

let didShowTokenWarning = false;

export default async function runCompletion(
  document: TextDocument,
  position: Position,
  timeout?: number,
  currentSuggestionText = ""
): Promise<AutocompleteResult | null | undefined> {
  setLoadingStatus(FULL_BRAND_REPRESENTATION);
  const offset = document.offsetAt(position);
  const beforeStartOffset = Math.max(0, offset - CHAR_LIMIT);
  const afterEndOffset = offset + CHAR_LIMIT;
  const beforeStart = document.positionAt(beforeStartOffset);
  const afterEnd = document.positionAt(afterEndOffset);
  const prefix =  document.getText(new Range(beforeStart, position)) + currentSuggestionText;
  const suffix = document.getText(new Range(position, afterEnd));

  type Config = WorkspaceConfiguration & {
    modelIdOrEndpoint: string;
    isFillMode: boolean;
    startToken: string;
    middleToken: string;
    endToken: string;
    stopToken: string;
    temperature: number;
  };
//   const config: Config = workspace.getConfiguration("HuggingFaceCode") as Config;
//   const { modelIdOrEndpoint, startToken, middleToken, endToken, stopToken, temperature } = config;
  const modelIdOrEndpoint = 'http://10.45.80.27:8000/hf/api/generate/';
  const startToken = '<fim_prefix>';
  const middleToken = '<fim_middle>';
  const endToken = '<fim_prefix>';
  const stopToken = '<|endoftext|>';
  const temperature = null;
  console.log(timeout);

  const context = getTabnineExtensionContext();
  const apiToken = await context?.secrets.get("apiToken");

  let endpoint = ""
  try{
    new URL(modelIdOrEndpoint);
    endpoint = modelIdOrEndpoint;
  }catch(e){
    endpoint = `https://api-inference.huggingface.co/models/${modelIdOrEndpoint}`

    // if user hasn't supplied API Token yet, ask user to supply one
    if(!apiToken && !didShowTokenWarning){
      didShowTokenWarning = true;
      void window.showInformationMessage(`In order to use "${modelIdOrEndpoint}" through Hugging Face API Inference, you'd need Hugging Face API Token`,
        "Get your token"
      ).then(clicked => {
        if (clicked) {
          void env.openExternal(Uri.parse("https://github.com/huggingface/huggingface-vscode#hf-api-token"));
        }
      });
    }
  }

  // use FIM (fill-in-middle) mode if suffix is available
  const inputs = suffix.trim() ? `${startToken}${prefix}${endToken}${suffix}${middleToken}` : prefix;

  const data = {
    inputs,
    parameters: {
      max_new_tokens: 60,
      temperature,
      do_sample: false,
      top_p: 0.95,
      stop: [stopToken]
    }
  };


  getLogger().writeVerbose(`INPUT to API http://10.45.80.27:8000/hf/api/generate/: (with parameters ${JSON.stringify(data)})`);

  const headers = {
    "Content-Type": "application/json",
    "Authorization": "",
  };
  if(apiToken){
    headers.Authorization = `Bearer ${apiToken}`;
  }

  let config = {
    method: 'post',
    url: 'http://10.45.80.27:8000/hf/api/generate/',
    headers,
    data 
  };

  let res;

  try {
      res = await axios.request(config);
  }
  catch (error) {
      getLogger().writeVerbose(`Error sending a request:, ${error}`);
      setDefaultStatus();
      return null;
  }

//   const res = await fetch(endpoint, {
//     method: "POST",
//     headers,
//     body: JSON.stringify(data),
//   });

  const generatedTextRaw = getGeneratedText(res.data);

  let generatedText = generatedTextRaw;
  if(generatedText.slice(0, inputs.length) === inputs){
    generatedText = generatedText.slice(inputs.length);
  }
  generatedText = generatedText.replace(stopToken, "").replace(middleToken, "");

  const resultEntry: ResultEntry = {
    new_prefix: generatedText,
    old_suffix: "",
    new_suffix: ""
  }

  const result: AutocompleteResult = {
    results: [resultEntry],
    old_prefix: "",
    user_message: [],
    is_locked: false,
  }

  setDefaultStatus();
  getLogger().writeVerbose(`OUTPUT from API: ${generatedTextRaw}`);
  return result;
}

function getGeneratedText(json: any): string{
  return json?.generated_text ?? json?.[0].generated_text ?? "";
}

export type KnownLanguageType = keyof typeof languages;

export function getLanguageFileExtension(
  languageId: string
): string | undefined {
  return languages[languageId as KnownLanguageType];
}

export function getFileNameWithExtension(document: TextDocument): string {
  const { languageId, fileName } = document;
  if (!document.isUntitled) {
    return fileName;
  }
  const extension = getLanguageFileExtension(languageId);
  if (extension) {
    return fileName.concat(extension);
  }
  return fileName;
}
