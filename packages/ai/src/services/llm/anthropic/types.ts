import { Schema } from "effect";

export const AnthropicModel = Schema.Literal(
	"claude-opus-4-6",
	"claude-sonnet-4-6",
	"claude-haiku-4-5",
	"claude-haiku-4-5-20251001",
	"claude-opus-4-5",
	"claude-opus-4-5-20251101",
	"claude-sonnet-4-5",
	"claude-sonnet-4-5-20250929",
	"claude-opus-4-1",
	"claude-opus-4-1-20250805",
	"claude-opus-4-0",
	"claude-opus-4-20250514",
	"claude-sonnet-4-0",
	"claude-sonnet-4-20250514",
	"claude-3-haiku-20240307",
);
export type AnthropicModel = typeof AnthropicModel.Type;

export const AnthropicCacheControlEphemeral = Schema.Struct({
	type: Schema.Literal("ephemeral"),
	ttl: Schema.optional(Schema.Literal("5m", "1h")),
});

export const AnthropicCitationCharLocation = Schema.Struct({
	type: Schema.Literal("char_location"),
	cited_text: Schema.String,
	document_index: Schema.Number,
	document_title: Schema.String,
	start_char_index: Schema.Number,
	end_char_index: Schema.Number,
});

export const AnthropicCitationPageLocation = Schema.Struct({
	type: Schema.Literal("page_location"),
	cited_text: Schema.String,
	document_index: Schema.Number,
	document_title: Schema.String,
	start_page_number: Schema.Number,
	end_page_number: Schema.Number,
});

export const AnthropicCitationContentBlockLocation = Schema.Struct({
	type: Schema.Literal("content_block_location"),
	cited_text: Schema.String,
	document_index: Schema.Number,
	document_title: Schema.String,
	start_block_index: Schema.Number,
	end_block_index: Schema.Number,
});

export const AnthropicCitationWebSearchResultLocation = Schema.Struct({
	type: Schema.Literal("web_search_result_location"),
	cited_text: Schema.String,
	title: Schema.String,
	url: Schema.String,
	encrypted_index: Schema.String,
});

export const AnthropicCitationSearchResultLocation = Schema.Struct({
	type: Schema.Literal("search_result_location"),
	cited_text: Schema.String,
	title: Schema.String,
	source: Schema.String,
	start_block_index: Schema.Number,
	end_block_index: Schema.Number,
	search_result_index: Schema.Number,
});

export const AnthropicTextCitation = Schema.Union(
	AnthropicCitationCharLocation,
	AnthropicCitationPageLocation,
	AnthropicCitationContentBlockLocation,
	AnthropicCitationWebSearchResultLocation,
	AnthropicCitationSearchResultLocation,
);
export type AnthropicTextCitation = typeof AnthropicTextCitation.Type;

export const AnthropicCitationsConfig = Schema.Struct({
	enabled: Schema.optional(Schema.Boolean),
});

export const AnthropicTextBlockParam = Schema.Struct({
	type: Schema.Literal("text"),
	text: Schema.String,
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
	citations: Schema.optional(Schema.Array(AnthropicTextCitation)),
});

export const AnthropicBase64ImageSource = Schema.Struct({
	type: Schema.Literal("base64"),
	media_type: Schema.Literal("image/jpeg", "image/png", "image/gif", "image/webp"),
	data: Schema.String,
});

export const AnthropicURLImageSource = Schema.Struct({
	type: Schema.Literal("url"),
	url: Schema.String,
});

export const AnthropicFileImageSource = Schema.Struct({
	type: Schema.Literal("file"),
	file_id: Schema.String,
});

export const AnthropicImageSource = Schema.Union(
	AnthropicBase64ImageSource,
	AnthropicURLImageSource,
	AnthropicFileImageSource,
);

export const AnthropicImageBlockParam = Schema.Struct({
	type: Schema.Literal("image"),
	source: AnthropicImageSource,
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicBase64PDFSource = Schema.Struct({
	type: Schema.Literal("base64"),
	media_type: Schema.Literal("application/pdf"),
	data: Schema.String,
});

export const AnthropicPlainTextSource = Schema.Struct({
	type: Schema.Literal("text"),
	media_type: Schema.Literal("text/plain", "text/html", "text/markdown", "text/csv"),
	data: Schema.String,
});

export const AnthropicURLPDFSource = Schema.Struct({
	type: Schema.Literal("url"),
	url: Schema.String,
});

export const AnthropicFileDocumentSource = Schema.Struct({
	type: Schema.Literal("file"),
	file_id: Schema.String,
});

export const AnthropicDocumentSource = Schema.Union(
	AnthropicBase64PDFSource,
	AnthropicPlainTextSource,
	AnthropicURLPDFSource,
	AnthropicFileDocumentSource,
);

export const AnthropicDocumentBlockParam = Schema.Struct({
	type: Schema.Literal("document"),
	source: AnthropicDocumentSource,
	title: Schema.optional(Schema.String),
	context: Schema.optional(Schema.String),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
	citations: Schema.optional(AnthropicCitationsConfig),
});

export const AnthropicDirectCaller = Schema.Struct({
	type: Schema.Literal("direct"),
});

export const AnthropicServerToolCaller = Schema.Struct({
	type: Schema.Literal("code_execution_20250825"),
	tool_id: Schema.String,
});

export const AnthropicServerToolCaller20260120 = Schema.Struct({
	type: Schema.Literal("code_execution_20260120"),
	tool_id: Schema.String,
});

export const AnthropicCaller = Schema.Union(
	AnthropicDirectCaller,
	AnthropicServerToolCaller,
	AnthropicServerToolCaller20260120,
);

export const AnthropicToolUseBlockParam = Schema.Struct({
	type: Schema.Literal("tool_use"),
	id: Schema.String,
	name: Schema.String,
	input: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
	caller: Schema.optional(AnthropicCaller),
});

export const AnthropicToolResultContentBlock = Schema.Union(
	AnthropicTextBlockParam,
	AnthropicImageBlockParam,
);
export type AnthropicToolResultContent = typeof AnthropicToolResultContentBlock.Type;

export const AnthropicToolResultBlockParam = Schema.Struct({
	type: Schema.Literal("tool_result"),
	tool_use_id: Schema.String,
	content: Schema.optional(
		Schema.Union(Schema.String, Schema.Array(AnthropicToolResultContentBlock)),
	),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
	is_error: Schema.optional(Schema.Boolean),
});

export const AnthropicThinkingBlockParam = Schema.Struct({
	type: Schema.Literal("thinking"),
	thinking: Schema.String,
	signature: Schema.String,
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicRedactedThinkingBlockParam = Schema.Struct({
	type: Schema.Literal("redacted_thinking"),
	data: Schema.String,
});

export const AnthropicSearchResultBlockParam = Schema.Struct({
	type: Schema.Literal("search_result"),
	title: Schema.String,
	source: Schema.String,
	content: Schema.Array(AnthropicTextBlockParam),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
	citations: Schema.optional(AnthropicCitationsConfig),
});

export const AnthropicServerToolUseBlockParam = Schema.Struct({
	type: Schema.Literal("server_tool_use"),
	id: Schema.String,
	name: Schema.String,
	input: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
	caller: Schema.optional(AnthropicCaller),
});

export const AnthropicToolReferenceBlockParam = Schema.Struct({
	type: Schema.Literal("tool_reference"),
	tool_name: Schema.String,
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicWebSearchResultBlock = Schema.Struct({
	type: Schema.Literal("web_search_result"),
	title: Schema.String,
	url: Schema.String,
	encrypted_content: Schema.String,
	page_age: Schema.optional(Schema.String),
});

export const AnthropicWebSearchToolRequestError = Schema.Struct({
	type: Schema.Literal("web_search_tool_request_error"),
	error: Schema.Struct({
		type: Schema.String,
		message: Schema.String,
	}),
});

export const AnthropicWebSearchToolResultBlockParam = Schema.Struct({
	type: Schema.Literal("web_search_tool_result"),
	tool_use_id: Schema.String,
	content: Schema.Union(
		Schema.Array(AnthropicWebSearchResultBlock),
		AnthropicWebSearchToolRequestError,
	),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
	caller: Schema.optional(AnthropicCaller),
});

export const AnthropicWebFetchResultBlock = Schema.Struct({
	type: Schema.Literal("web_fetch_result"),
	url: Schema.String,
	content: AnthropicDocumentBlockParam,
	retrieved_at: Schema.optional(Schema.String),
});

export const AnthropicWebFetchToolResultErrorBlock = Schema.Struct({
	type: Schema.Literal("web_fetch_tool_result_error"),
	error: Schema.Struct({
		type: Schema.String,
		message: Schema.String,
	}),
});

export const AnthropicWebFetchToolResultBlockParam = Schema.Struct({
	type: Schema.Literal("web_fetch_tool_result"),
	tool_use_id: Schema.String,
	content: Schema.Union(AnthropicWebFetchResultBlock, AnthropicWebFetchToolResultErrorBlock),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
	caller: Schema.optional(AnthropicCaller),
});

export const AnthropicCodeExecutionOutputBlock = Schema.Struct({
	type: Schema.Literal("code_execution_output"),
	file_id: Schema.String,
	file_name: Schema.optional(Schema.String),
});

export const AnthropicCodeExecutionResultBlock = Schema.Struct({
	type: Schema.Literal("code_execution_result"),
	stdout: Schema.String,
	stderr: Schema.String,
	return_code: Schema.Number,
	content: Schema.Array(AnthropicCodeExecutionOutputBlock),
});

export const AnthropicEncryptedCodeExecutionResultBlock = Schema.Struct({
	type: Schema.Literal("encrypted_code_execution_result"),
	encrypted_stdout: Schema.String,
	stderr: Schema.String,
	return_code: Schema.Number,
	content: Schema.Array(AnthropicCodeExecutionOutputBlock),
});

export const AnthropicCodeExecutionToolResultError = Schema.Struct({
	type: Schema.Literal("code_execution_tool_result_error"),
	error: Schema.Struct({
		type: Schema.String,
		message: Schema.String,
	}),
});

export const AnthropicCodeExecutionToolResultBlockParam = Schema.Struct({
	type: Schema.Literal("code_execution_tool_result"),
	tool_use_id: Schema.String,
	content: Schema.Union(
		AnthropicCodeExecutionResultBlock,
		AnthropicEncryptedCodeExecutionResultBlock,
		AnthropicCodeExecutionToolResultError,
	),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicBashCodeExecutionOutputBlock = Schema.Struct({
	type: Schema.Literal("bash_code_execution_output"),
	file_id: Schema.String,
	file_name: Schema.optional(Schema.String),
});

export const AnthropicBashCodeExecutionResultBlock = Schema.Struct({
	type: Schema.Literal("bash_code_execution_result"),
	stdout: Schema.String,
	stderr: Schema.String,
	return_code: Schema.Number,
	content: Schema.Array(AnthropicBashCodeExecutionOutputBlock),
});

export const AnthropicBashCodeExecutionToolResultError = Schema.Struct({
	type: Schema.Literal("bash_code_execution_tool_result_error"),
	error: Schema.Struct({
		type: Schema.String,
		message: Schema.String,
	}),
});

export const AnthropicBashCodeExecutionToolResultBlockParam = Schema.Struct({
	type: Schema.Literal("bash_code_execution_tool_result"),
	tool_use_id: Schema.String,
	content: Schema.Union(
		AnthropicBashCodeExecutionResultBlock,
		AnthropicBashCodeExecutionToolResultError,
	),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicTextEditorViewResultBlock = Schema.Struct({
	type: Schema.Literal("text_editor_code_execution_view_result"),
	file_type: Schema.Literal("text", "image", "pdf"),
	content: Schema.String,
	start_line: Schema.optional(Schema.Number),
	num_lines: Schema.optional(Schema.Number),
	total_lines: Schema.optional(Schema.Number),
});

export const AnthropicTextEditorCreateResultBlock = Schema.Struct({
	type: Schema.Literal("text_editor_code_execution_create_result"),
	is_file_update: Schema.Boolean,
});

export const AnthropicTextEditorStrReplaceResultBlock = Schema.Struct({
	type: Schema.Literal("text_editor_code_execution_str_replace_result"),
	old_start: Schema.optional(Schema.Number),
	old_lines: Schema.optional(Schema.Number),
	new_start: Schema.optional(Schema.Number),
	new_lines: Schema.optional(Schema.Number),
	lines: Schema.optional(Schema.Array(Schema.String)),
});

export const AnthropicTextEditorCodeExecutionToolResultError = Schema.Struct({
	type: Schema.Literal("text_editor_code_execution_tool_result_error"),
	error: Schema.Struct({
		type: Schema.String,
		message: Schema.String,
	}),
});

export const AnthropicTextEditorCodeExecutionToolResultBlockParam = Schema.Struct({
	type: Schema.Literal("text_editor_code_execution_tool_result"),
	tool_use_id: Schema.String,
	content: Schema.Union(
		AnthropicTextEditorViewResultBlock,
		AnthropicTextEditorCreateResultBlock,
		AnthropicTextEditorStrReplaceResultBlock,
		AnthropicTextEditorCodeExecutionToolResultError,
	),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicMCPToolUseBlockParam = Schema.Struct({
	type: Schema.Literal("mcp_tool_use"),
	id: Schema.String,
	name: Schema.String,
	server_name: Schema.String,
	input: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicMCPToolResultBlockParam = Schema.Struct({
	type: Schema.Literal("mcp_tool_result"),
	tool_use_id: Schema.String,
	content: Schema.optional(Schema.Union(Schema.String, Schema.Array(AnthropicTextBlockParam))),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
	is_error: Schema.optional(Schema.Boolean),
});

export const AnthropicContainerUploadBlockParam = Schema.Struct({
	type: Schema.Literal("container_upload"),
	file_id: Schema.String,
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicCompactionBlockParam = Schema.Struct({
	type: Schema.Literal("compaction"),
	content: Schema.String,
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicToolSearchToolResultBlockParam = Schema.Struct({
	type: Schema.Literal("tool_search_tool_result"),
	tool_use_id: Schema.String,
	content: Schema.Unknown,
});

export const AnthropicContentBlockParam = Schema.Union(
	AnthropicTextBlockParam,
	AnthropicImageBlockParam,
	AnthropicDocumentBlockParam,
	AnthropicToolUseBlockParam,
	AnthropicToolResultBlockParam,
	AnthropicThinkingBlockParam,
	AnthropicRedactedThinkingBlockParam,
	AnthropicSearchResultBlockParam,
	AnthropicServerToolUseBlockParam,
	AnthropicToolReferenceBlockParam,
	AnthropicWebSearchResultBlock,
	AnthropicToolSearchToolResultBlockParam,
	AnthropicWebSearchToolResultBlockParam,
	AnthropicWebFetchToolResultBlockParam,
	AnthropicCodeExecutionToolResultBlockParam,
	AnthropicBashCodeExecutionToolResultBlockParam,
	AnthropicTextEditorCodeExecutionToolResultBlockParam,
	AnthropicMCPToolUseBlockParam,
	AnthropicMCPToolResultBlockParam,
	AnthropicContainerUploadBlockParam,
	AnthropicCompactionBlockParam,
);
export type AnthropicContentBlock = typeof AnthropicContentBlockParam.Type;

export const AnthropicMessageParam = Schema.Struct({
	role: Schema.Literal("user", "assistant"),
	content: Schema.Union(Schema.String, Schema.Array(AnthropicContentBlockParam)),
});
export type AnthropicMessage = typeof AnthropicMessageParam.Type;

export const AnthropicInputSchema = Schema.Struct({
	type: Schema.Literal("object"),
	properties: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	required: Schema.optional(Schema.Array(Schema.String)),
});

export const AnthropicAllowedCallers = Schema.Array(
	Schema.Literal("direct", "code_execution_20250825", "code_execution_20260120"),
);

export const AnthropicCustomTool = Schema.Struct({
	type: Schema.optionalWith(Schema.Literal("custom"), { default: () => "custom" as const }),
	name: Schema.String,
	description: Schema.optional(Schema.String),
	input_schema: AnthropicInputSchema,
	input_examples: Schema.optional(
		Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	),
	defer_loading: Schema.optional(Schema.Boolean),
	strict: Schema.optional(Schema.Boolean),
	eager_input_streaming: Schema.optional(Schema.Boolean),
	allowed_callers: Schema.optional(AnthropicAllowedCallers),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});
export type AnthropicCustomTool = typeof AnthropicCustomTool.Type;

export const AnthropicBashTool20241022 = Schema.Struct({
	type: Schema.Literal("bash_20241022"),
	name: Schema.Literal("bash"),
	defer_loading: Schema.optional(Schema.Boolean),
	input_examples: Schema.optional(
		Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	),
	strict: Schema.optional(Schema.Boolean),
	allowed_callers: Schema.optional(AnthropicAllowedCallers),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicBashTool20250124 = Schema.Struct({
	type: Schema.Literal("bash_20250124"),
	name: Schema.Literal("bash"),
	defer_loading: Schema.optional(Schema.Boolean),
	input_examples: Schema.optional(
		Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	),
	strict: Schema.optional(Schema.Boolean),
	allowed_callers: Schema.optional(AnthropicAllowedCallers),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicTextEditorTool20241022 = Schema.Struct({
	type: Schema.Literal("text_editor_20241022"),
	name: Schema.Literal("text_editor"),
	defer_loading: Schema.optional(Schema.Boolean),
	input_examples: Schema.optional(
		Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	),
	strict: Schema.optional(Schema.Boolean),
	allowed_callers: Schema.optional(AnthropicAllowedCallers),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicComputerUseTool20241022 = Schema.Struct({
	type: Schema.Literal("computer_20241022"),
	name: Schema.Literal("computer"),
	display_width_px: Schema.Number,
	display_height_px: Schema.Number,
	display_number: Schema.optional(Schema.Number),
	defer_loading: Schema.optional(Schema.Boolean),
	input_examples: Schema.optional(
		Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	),
	strict: Schema.optional(Schema.Boolean),
	allowed_callers: Schema.optional(AnthropicAllowedCallers),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicComputerUseTool20250124 = Schema.Struct({
	type: Schema.Literal("computer_20250124"),
	name: Schema.Literal("computer"),
	display_width_px: Schema.Number,
	display_height_px: Schema.Number,
	display_number: Schema.optional(Schema.Number),
	defer_loading: Schema.optional(Schema.Boolean),
	input_examples: Schema.optional(
		Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	),
	strict: Schema.optional(Schema.Boolean),
	allowed_callers: Schema.optional(AnthropicAllowedCallers),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicCodeExecutionTool20250522 = Schema.Struct({
	type: Schema.Literal("code_execution_20250522"),
	name: Schema.Literal("code_execution"),
	defer_loading: Schema.optional(Schema.Boolean),
	strict: Schema.optional(Schema.Boolean),
	allowed_callers: Schema.optional(AnthropicAllowedCallers),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicCodeExecutionTool20250825 = Schema.Struct({
	type: Schema.Literal("code_execution_20250825"),
	name: Schema.Literal("code_execution"),
	defer_loading: Schema.optional(Schema.Boolean),
	strict: Schema.optional(Schema.Boolean),
	allowed_callers: Schema.optional(AnthropicAllowedCallers),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicCodeExecutionTool20260120 = Schema.Struct({
	type: Schema.Literal("code_execution_20260120"),
	name: Schema.Literal("code_execution"),
	defer_loading: Schema.optional(Schema.Boolean),
	strict: Schema.optional(Schema.Boolean),
	allowed_callers: Schema.optional(AnthropicAllowedCallers),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicMemoryTool20250818 = Schema.Struct({
	type: Schema.Literal("memory_20250818"),
	name: Schema.Literal("memory"),
	defer_loading: Schema.optional(Schema.Boolean),
	input_examples: Schema.optional(
		Schema.Array(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	),
	strict: Schema.optional(Schema.Boolean),
	allowed_callers: Schema.optional(AnthropicAllowedCallers),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicToolSearchTool = Schema.Struct({
	type: Schema.Literal("tool_search_tool_bm25_20251119"),
	name: Schema.Literal("tool_search"),
});

export const AnthropicWebSearchTool20250305 = Schema.Struct({
	type: Schema.Literal("web_search_20250305"),
	name: Schema.Literal("web_search"),
	max_uses: Schema.optional(Schema.Number),
	allowed_domains: Schema.optional(Schema.Array(Schema.String)),
	blocked_domains: Schema.optional(Schema.Array(Schema.String)),
	user_location: Schema.optional(
		Schema.Struct({
			type: Schema.Literal("approximate"),
			city: Schema.optional(Schema.String),
			region: Schema.optional(Schema.String),
			country: Schema.optional(Schema.String),
			timezone: Schema.optional(Schema.String),
		}),
	),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicWebFetchTool20250305 = Schema.Struct({
	type: Schema.Literal("web_fetch_20250305"),
	name: Schema.Literal("web_fetch"),
	max_uses: Schema.optional(Schema.Number),
	allowed_domains: Schema.optional(Schema.Array(Schema.String)),
	blocked_domains: Schema.optional(Schema.Array(Schema.String)),
	cache_control: Schema.optional(AnthropicCacheControlEphemeral),
});

export const AnthropicToolUnion = Schema.Union(
	AnthropicCustomTool,
	AnthropicBashTool20241022,
	AnthropicBashTool20250124,
	AnthropicTextEditorTool20241022,
	AnthropicComputerUseTool20241022,
	AnthropicComputerUseTool20250124,
	AnthropicCodeExecutionTool20250522,
	AnthropicCodeExecutionTool20250825,
	AnthropicCodeExecutionTool20260120,
	AnthropicMemoryTool20250818,
	AnthropicToolSearchTool,
	AnthropicWebSearchTool20250305,
	AnthropicWebFetchTool20250305,
);
export type AnthropicTool = typeof AnthropicToolUnion.Type;

export const AnthropicToolChoiceAuto = Schema.Struct({
	type: Schema.Literal("auto"),
	disable_parallel_tool_use: Schema.optional(Schema.Boolean),
});

export const AnthropicToolChoiceAny = Schema.Struct({
	type: Schema.Literal("any"),
	disable_parallel_tool_use: Schema.optional(Schema.Boolean),
});

export const AnthropicToolChoiceTool = Schema.Struct({
	type: Schema.Literal("tool"),
	name: Schema.String,
	disable_parallel_tool_use: Schema.optional(Schema.Boolean),
});

export const AnthropicToolChoiceNone = Schema.Struct({
	type: Schema.Literal("none"),
	disable_parallel_tool_use: Schema.optional(Schema.Boolean),
});

export const AnthropicToolChoice = Schema.Union(
	AnthropicToolChoiceAuto,
	AnthropicToolChoiceAny,
	AnthropicToolChoiceTool,
	AnthropicToolChoiceNone,
);
export type AnthropicToolChoice = typeof AnthropicToolChoice.Type;

export const AnthropicThinkingConfigEnabled = Schema.Struct({
	type: Schema.Literal("enabled"),
	budget_tokens: Schema.Number,
	display: Schema.optional(Schema.Literal("summarized", "omitted")),
});

export const AnthropicThinkingConfigDisabled = Schema.Struct({
	type: Schema.Literal("disabled"),
});

export const AnthropicThinkingConfigAdaptive = Schema.Struct({
	type: Schema.Literal("adaptive"),
	display: Schema.optional(Schema.Literal("summarized", "omitted")),
});

export const AnthropicThinkingConfig = Schema.Union(
	AnthropicThinkingConfigEnabled,
	AnthropicThinkingConfigDisabled,
	AnthropicThinkingConfigAdaptive,
);
export type AnthropicThinkingConfig = typeof AnthropicThinkingConfig.Type;

export const AnthropicMetadata = Schema.Struct({
	user_id: Schema.optional(Schema.String),
});

export const AnthropicJSONOutputFormat = Schema.Struct({
	type: Schema.Literal("json_schema"),
	schema: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
});

export const AnthropicOutputConfig = Schema.Struct({
	format: Schema.optional(AnthropicJSONOutputFormat),
	effort: Schema.optional(Schema.Literal("low", "medium", "high", "max")),
});

export const AnthropicSkillParams = Schema.Struct({
	skill_id: Schema.String,
	type: Schema.Literal("anthropic", "custom"),
	version: Schema.optional(Schema.String),
});

export const AnthropicContainerParams = Schema.Struct({
	id: Schema.optional(Schema.String),
	skills: Schema.optional(Schema.Array(AnthropicSkillParams)),
});

export const AnthropicContainer = Schema.Union(AnthropicContainerParams, Schema.String);

export const AnthropicInputTokensTrigger = Schema.Struct({
	type: Schema.Literal("input_tokens"),
	value: Schema.Number,
});

export const AnthropicToolUsesTrigger = Schema.Struct({
	type: Schema.Literal("tool_uses"),
	value: Schema.Number,
});

export const AnthropicClearToolUsesEdit = Schema.Struct({
	type: Schema.Literal("clear_tool_uses_20250919"),
	trigger: Schema.optional(Schema.Union(AnthropicInputTokensTrigger, AnthropicToolUsesTrigger)),
	keep: Schema.optional(
		Schema.Struct({
			type: Schema.Literal("tool_uses"),
			value: Schema.Number,
		}),
	),
	clear_tool_inputs: Schema.optional(Schema.Union(Schema.Boolean, Schema.Array(Schema.String))),
	exclude_tools: Schema.optional(Schema.Array(Schema.String)),
	clear_at_least: Schema.optional(
		Schema.Struct({
			type: Schema.Literal("input_tokens"),
			value: Schema.Number,
		}),
	),
});

export const AnthropicClearThinkingKeepTurns = Schema.Struct({
	type: Schema.Literal("thinking_turns"),
	value: Schema.Number,
});

export const AnthropicClearThinkingKeepAll = Schema.Struct({
	type: Schema.Literal("all"),
});

export const AnthropicClearThinkingEdit = Schema.Struct({
	type: Schema.Literal("clear_thinking_20251015"),
	keep: Schema.optional(
		Schema.Union(
			AnthropicClearThinkingKeepTurns,
			AnthropicClearThinkingKeepAll,
			Schema.Literal("all"),
		),
	),
});

export const AnthropicCompactEdit = Schema.Struct({
	type: Schema.Literal("compact_20260112"),
	trigger: Schema.optional(AnthropicInputTokensTrigger),
	instructions: Schema.optional(Schema.String),
	pause_after_compaction: Schema.optional(Schema.Boolean),
});

export const AnthropicContextManagementEdit = Schema.Union(
	AnthropicClearToolUsesEdit,
	AnthropicClearThinkingEdit,
	AnthropicCompactEdit,
);

export const AnthropicContextManagementConfig = Schema.Struct({
	edits: Schema.optional(Schema.Array(AnthropicContextManagementEdit)),
});

export const AnthropicMCPServerToolConfiguration = Schema.Struct({
	enabled: Schema.optional(Schema.Boolean),
	allowed_tools: Schema.optional(Schema.Array(Schema.String)),
});

export const AnthropicMCPServerDefinition = Schema.Struct({
	type: Schema.Literal("url"),
	name: Schema.String,
	url: Schema.String,
	authorization_token: Schema.optional(Schema.String),
	tool_configuration: Schema.optional(AnthropicMCPServerToolConfiguration),
});

export const AnthropicSystemContentBlock = Schema.Union(
	AnthropicTextBlockParam,
	AnthropicCacheControlEphemeral,
);

export const AnthropicMessagesRequest = Schema.Struct({
	model: Schema.String,
	messages: Schema.Array(AnthropicMessageParam),
	max_tokens: Schema.optional(Schema.Number),
	system: Schema.optional(Schema.Union(Schema.String, Schema.Array(AnthropicTextBlockParam))),
	temperature: Schema.optional(Schema.Number),
	top_p: Schema.optional(Schema.Number),
	top_k: Schema.optional(Schema.Number),
	stop_sequences: Schema.optional(Schema.Array(Schema.String)),
	stream: Schema.optional(Schema.Boolean),
	metadata: Schema.optional(AnthropicMetadata),
	thinking: Schema.optional(AnthropicThinkingConfig),
	tool_choice: Schema.optional(AnthropicToolChoice),
	tools: Schema.optional(Schema.Array(AnthropicToolUnion)),
	output_config: Schema.optional(AnthropicOutputConfig),
	output_format: Schema.optional(AnthropicJSONOutputFormat),
	mcp_servers: Schema.optional(Schema.Array(AnthropicMCPServerDefinition)),
	container: Schema.optional(AnthropicContainer),
	context_management: Schema.optional(AnthropicContextManagementConfig),
	inference_geo: Schema.optional(Schema.String),
	service_tier: Schema.optional(Schema.Literal("auto", "standard_only")),
	speed: Schema.optional(Schema.Literal("standard", "fast")),
});
export type AnthropicMessagesRequest = typeof AnthropicMessagesRequest.Type;

export const AnthropicServerToolUseUsage = Schema.Struct({
	name: Schema.String,
	input_tokens: Schema.Number,
	output_tokens: Schema.Number,
});

export const AnthropicMessagesUsage = Schema.Struct({
	input_tokens: Schema.Int,
	output_tokens: Schema.Int,
	cache_creation_input_tokens: Schema.optional(Schema.Int),
	cache_read_input_tokens: Schema.optional(Schema.Int),
	server_tool_use: Schema.optional(Schema.Array(AnthropicServerToolUseUsage)),
});
export type AnthropicUsage = typeof AnthropicMessagesUsage.Type;

export const AnthropicStopReason = Schema.Literal(
	"end_turn",
	"max_tokens",
	"stop_sequence",
	"tool_use",
	"pause_turn",
	"refusal",
);
export type AnthropicStopReason = typeof AnthropicStopReason.Type;

export const AnthropicResponseContentBlock = Schema.Union(
	AnthropicTextBlockParam,
	AnthropicToolUseBlockParam,
	AnthropicThinkingBlockParam,
	AnthropicRedactedThinkingBlockParam,
	AnthropicServerToolUseBlockParam,
	AnthropicWebSearchResultBlock,
	AnthropicToolSearchToolResultBlockParam,
	AnthropicWebSearchToolResultBlockParam,
	AnthropicWebFetchToolResultBlockParam,
	AnthropicCodeExecutionToolResultBlockParam,
	AnthropicBashCodeExecutionToolResultBlockParam,
	AnthropicTextEditorCodeExecutionToolResultBlockParam,
	AnthropicMCPToolUseBlockParam,
	AnthropicMCPToolResultBlockParam,
	AnthropicCompactionBlockParam,
);
export type AnthropicResponseContentBlock = typeof AnthropicResponseContentBlock.Type;

export const AnthropicMessagesResponse = Schema.Struct({
	id: Schema.String,
	type: Schema.Literal("message"),
	role: Schema.Literal("assistant"),
	model: Schema.String,
	content: Schema.Array(AnthropicResponseContentBlock),
	stop_reason: Schema.NullOr(AnthropicStopReason),
	stop_sequence: Schema.optional(Schema.NullOr(Schema.String)),
	usage: AnthropicMessagesUsage,
});
export type AnthropicMessagesResponse = typeof AnthropicMessagesResponse.Type;

export const AnthropicStreamTextDelta = Schema.Struct({
	type: Schema.Literal("text_delta"),
	text: Schema.String,
});

export const AnthropicStreamInputJsonDelta = Schema.Struct({
	type: Schema.Literal("input_json_delta"),
	partial_json: Schema.String,
});

export const AnthropicStreamThinkingDelta = Schema.Struct({
	type: Schema.Literal("thinking_delta"),
	thinking: Schema.String,
});

export const AnthropicStreamSignatureDelta = Schema.Struct({
	type: Schema.Literal("signature_delta"),
	signature: Schema.String,
});

export const AnthropicStreamCitationsDelta = Schema.Struct({
	type: Schema.Literal("citations_delta"),
	citations: Schema.Array(AnthropicTextCitation),
});

export const AnthropicStreamCompactionDelta = Schema.Struct({
	type: Schema.Literal("compaction_delta"),
	summary: Schema.String,
});

export const AnthropicStreamDelta = Schema.Union(
	AnthropicStreamTextDelta,
	AnthropicStreamInputJsonDelta,
	AnthropicStreamThinkingDelta,
	AnthropicStreamSignatureDelta,
	AnthropicStreamCitationsDelta,
	AnthropicStreamCompactionDelta,
);
export type AnthropicStreamDelta = typeof AnthropicStreamDelta.Type;

export const AnthropicStreamMessageStart = Schema.Struct({
	type: Schema.Literal("message_start"),
	message: AnthropicMessagesResponse,
});

export const AnthropicStreamContentBlockStart = Schema.Struct({
	type: Schema.Literal("content_block_start"),
	index: Schema.Int,
	content_block: AnthropicResponseContentBlock,
});

export const AnthropicStreamContentBlockDelta = Schema.Struct({
	type: Schema.Literal("content_block_delta"),
	index: Schema.Int,
	delta: AnthropicStreamDelta,
});

export const AnthropicStreamContentBlockStop = Schema.Struct({
	type: Schema.Literal("content_block_stop"),
	index: Schema.Int,
});

export const AnthropicStreamMessageDelta = Schema.Struct({
	type: Schema.Literal("message_delta"),
	delta: Schema.Struct({
		stop_reason: Schema.Union(AnthropicStopReason, Schema.Null),
		stop_sequence: Schema.optional(Schema.NullOr(Schema.String)),
	}),
	usage: Schema.Struct({
		output_tokens: Schema.Int,
		cache_creation_input_tokens: Schema.optional(Schema.Int),
		cache_read_input_tokens: Schema.optional(Schema.Int),
	}),
});

export const AnthropicStreamMessageStop = Schema.Struct({
	type: Schema.Literal("message_stop"),
});

export const AnthropicStreamPing = Schema.Struct({
	type: Schema.Literal("ping"),
});

export const AnthropicStreamError = Schema.Struct({
	type: Schema.Literal("error"),
	error: Schema.Struct({
		type: Schema.String,
		message: Schema.String,
	}),
});

export const AnthropicStreamEvent = Schema.Union(
	AnthropicStreamMessageStart,
	AnthropicStreamContentBlockStart,
	AnthropicStreamContentBlockDelta,
	AnthropicStreamContentBlockStop,
	AnthropicStreamMessageDelta,
	AnthropicStreamMessageStop,
	AnthropicStreamPing,
	AnthropicStreamError,
);
export type AnthropicStreamEvent = typeof AnthropicStreamEvent.Type;

export {
	AnthropicCompactionBlockParam as AnthropicMessagesCompactionBlockParam,
	AnthropicCustomTool as AnthropicMessagesCustomTool,
	AnthropicImageBlockParam as AnthropicMessagesImageBlockParam,
	AnthropicMessageParam as AnthropicMessagesMessage,
	AnthropicRedactedThinkingBlockParam as AnthropicMessagesRedactedThinkingBlockParam,
	AnthropicStreamCompactionDelta as AnthropicMessagesStreamCompactionDelta,
	AnthropicStreamInputJsonDelta as AnthropicMessagesStreamInputJsonDelta,
	AnthropicStreamSignatureDelta as AnthropicMessagesStreamSignatureDelta,
	AnthropicStreamTextDelta as AnthropicMessagesStreamTextDelta,
	AnthropicStreamThinkingDelta as AnthropicMessagesStreamThinkingDelta,
	AnthropicTextBlockParam as AnthropicMessagesTextBlockParam,
	AnthropicThinkingBlockParam as AnthropicMessagesThinkingBlockParam,
	AnthropicToolResultBlockParam as AnthropicMessagesToolResultBlockParam,
	AnthropicToolUseBlockParam as AnthropicMessagesToolUseBlockParam,
};
