use serde::Serialize;

use super::{random, request_body::MessageType};

#[derive(Debug, Serialize, Clone)]
pub struct UserRequest {
    pub message: String,

    #[serde(rename = "currentRootPath")]
    pub current_root_path: String,

    #[serde(rename = "currentFileName")]
    pub current_file_name: String,

    #[serde(rename = "currentFileContents")]
    pub current_file_contents: String,

    #[serde(rename = "precedingCode")]
    pub preceding_code: Vec<String>,

    #[serde(rename = "suffixCode")]
    pub suffix_code: Vec<String>,

    #[serde(rename = "currentSelection")]
    pub current_selection: Option<String>,

    #[serde(rename = "copilotCodeBlocks")]
    pub copilot_code_blocks: Vec<String>,

    #[serde(rename = "customCodeBlocks")]
    pub custom_code_blocks: Vec<String>,

    #[serde(rename = "codeBlockIdentifiers")]
    pub code_block_identifiers: Vec<String>,

    #[serde(rename = "msgType")]
    pub message_type: MessageType,

    #[serde(rename = "maxOrigLine")]
    pub max_original_line: i32,
}

impl UserRequest {
    pub fn new(
        message: String,
        current_root_path: String,
        current_file_name: String,
        current_file_contents: String,
        preceding_code: Vec<String>,
        suffix_code: Vec<String>,
        current_selection: Option<String>,
        message_type: MessageType,
    ) -> Self {
        Self {
            message,
            current_root_path,
            current_file_name,
            current_file_contents,
            preceding_code,
            suffix_code,
            current_selection,
            copilot_code_blocks: vec![],
            custom_code_blocks: vec![],
            code_block_identifiers: vec![],
            message_type,
            max_original_line: random(),
        }
    }
}
