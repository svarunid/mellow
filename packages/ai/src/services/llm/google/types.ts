import { Schema } from "effect";

export const GeminiModel = Schema.Literal(
	"gemini-2.5-flash",
	"gemini-2.5-flash-image",
	"gemini-2.5-flash-lite",
	"gemini-2.5-flash-lite-preview-09-2025",
	"gemini-2.5-flash-native-audio-preview-12-2025",
	"gemini-2.5-flash-preview-09-2025",
	"gemini-2.5-flash-preview-tts",
	"gemini-2.5-pro",
	"gemini-2.5-pro-preview-tts",
	"gemini-3-flash-preview",
	"gemini-3-pro-image-preview",
	"gemini-3-pro-preview",
	"gemini-3.1-pro-preview",
	"gemini-3.1-flash-image-preview",
);
export type GeminiModel = typeof GeminiModel.Type;

export const GeminiAgent = Schema.Literal("deep-research-pro-preview-12-2025");
export type GeminiAgent = typeof GeminiAgent.Type;

export const GeminiResponseModality = Schema.Literal("text", "image", "audio");
export type GeminiResponseModality = typeof GeminiResponseModality.Type;

export const GeminiMediaResolution = Schema.Literal("low", "medium", "high", "ultra_high");
export type GeminiMediaResolution = typeof GeminiMediaResolution.Type;

export const GeminiThinkingLevel = Schema.Literal("minimal", "low", "medium", "high");
export type GeminiThinkingLevel = typeof GeminiThinkingLevel.Type;

export const GeminiThinkingSummaries = Schema.Literal("auto", "none");
export type GeminiThinkingSummaries = typeof GeminiThinkingSummaries.Type;

export const GeminiToolChoiceType = Schema.Literal("auto", "any", "none", "validated");
export type GeminiToolChoiceType = typeof GeminiToolChoiceType.Type;

export const GeminiAnnotation = Schema.Struct({
	type: Schema.Literal("url_citation"),
	url: Schema.String,
	title: Schema.optional(Schema.String),
	start_index: Schema.optional(Schema.Int),
	end_index: Schema.optional(Schema.Int),
});
export type GeminiAnnotation = typeof GeminiAnnotation.Type;

export const GeminiThoughtSummaryContent = Schema.Struct({
	type: Schema.Literal("text"),
	text: Schema.String,
});

export const GeminiTextContent = Schema.Struct({
	type: Schema.Literal("text"),
	text: Schema.String,
	annotations: Schema.optional(Schema.Array(GeminiAnnotation)),
});
export type GeminiTextContent = typeof GeminiTextContent.Type;

export const GeminiImageContent = Schema.Struct({
	type: Schema.Literal("image"),
	data: Schema.optional(Schema.String),
	uri: Schema.optional(Schema.String),
	mime_type: Schema.optional(
		Schema.Literal("image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"),
	),
	resolution: Schema.optional(GeminiMediaResolution),
});
export type GeminiImageContent = typeof GeminiImageContent.Type;

export const GeminiAudioContent = Schema.Struct({
	type: Schema.Literal("audio"),
	data: Schema.optional(Schema.String),
	uri: Schema.optional(Schema.String),
	mime_type: Schema.optional(
		Schema.Literal("audio/wav", "audio/mp3", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac"),
	),
});
export type GeminiAudioContent = typeof GeminiAudioContent.Type;

export const GeminiDocumentContent = Schema.Struct({
	type: Schema.Literal("document"),
	data: Schema.optional(Schema.String),
	uri: Schema.optional(Schema.String),
	mime_type: Schema.optional(Schema.Literal("application/pdf")),
});
export type GeminiDocumentContent = typeof GeminiDocumentContent.Type;

export const GeminiVideoContent = Schema.Struct({
	type: Schema.Literal("video"),
	data: Schema.optional(Schema.String),
	uri: Schema.optional(Schema.String),
	mime_type: Schema.optional(
		Schema.Literal(
			"video/mp4",
			"video/mpeg",
			"video/mpg",
			"video/mov",
			"video/avi",
			"video/x-flv",
			"video/webm",
			"video/wmv",
			"video/3gpp",
		),
	),
	resolution: Schema.optional(GeminiMediaResolution),
});
export type GeminiVideoContent = typeof GeminiVideoContent.Type;

export const GeminiThoughtContent = Schema.Struct({
	type: Schema.Literal("thought"),
	summary: Schema.optional(Schema.Array(GeminiThoughtSummaryContent)),
	signature: Schema.optional(Schema.String),
});
export type GeminiThoughtContent = typeof GeminiThoughtContent.Type;

export const GeminiFunctionCallContent = Schema.Struct({
	type: Schema.Literal("function_call"),
	name: Schema.String,
	arguments: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
	id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiFunctionCallContent = typeof GeminiFunctionCallContent.Type;

export const GeminiFunctionResultSubcontent = Schema.Union(
	GeminiTextContent,
	GeminiImageContent,
	GeminiAudioContent,
	GeminiDocumentContent,
	GeminiVideoContent,
);

export const GeminiFunctionResultContent = Schema.Struct({
	type: Schema.Literal("function_result"),
	name: Schema.optional(Schema.String),
	is_error: Schema.optional(Schema.Boolean),
	result: Schema.Union(Schema.String, Schema.Array(GeminiFunctionResultSubcontent)),
	call_id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiFunctionResultContent = typeof GeminiFunctionResultContent.Type;

export const GeminiCodeExecutionCallArguments = Schema.Struct({
	language: Schema.Literal("python"),
	code: Schema.String,
});

export const GeminiCodeExecutionCallContent = Schema.Struct({
	type: Schema.Literal("code_execution_call"),
	arguments: GeminiCodeExecutionCallArguments,
	id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiCodeExecutionCallContent = typeof GeminiCodeExecutionCallContent.Type;

export const GeminiCodeExecutionResultContent = Schema.Struct({
	type: Schema.Literal("code_execution_result"),
	result: Schema.String,
	is_error: Schema.optional(Schema.Boolean),
	call_id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiCodeExecutionResultContent = typeof GeminiCodeExecutionResultContent.Type;

export const GeminiUrlContextCallArguments = Schema.Struct({
	urls: Schema.Array(Schema.String),
});

export const GeminiUrlContextCallContent = Schema.Struct({
	type: Schema.Literal("url_context_call"),
	arguments: GeminiUrlContextCallArguments,
	id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiUrlContextCallContent = typeof GeminiUrlContextCallContent.Type;

export const GeminiUrlContextResult = Schema.Struct({
	url: Schema.String,
	status: Schema.Literal("success", "error", "paywall", "unsafe"),
});

export const GeminiUrlContextResultContent = Schema.Struct({
	type: Schema.Literal("url_context_result"),
	result: Schema.Array(GeminiUrlContextResult),
	is_error: Schema.optional(Schema.Boolean),
	call_id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiUrlContextResultContent = typeof GeminiUrlContextResultContent.Type;

export const GeminiGoogleSearchCallArguments = Schema.Struct({
	queries: Schema.Array(Schema.String),
});

export const GeminiGoogleSearchCallContent = Schema.Struct({
	type: Schema.Literal("google_search_call"),
	arguments: GeminiGoogleSearchCallArguments,
	search_type: Schema.optional(Schema.Literal("web_search", "image_search")),
	id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiGoogleSearchCallContent = typeof GeminiGoogleSearchCallContent.Type;

export const GeminiGoogleSearchResult = Schema.Struct({
	url: Schema.String,
	title: Schema.optional(Schema.String),
	search_suggestions: Schema.optional(Schema.String),
});

export const GeminiGoogleSearchResultContent = Schema.Struct({
	type: Schema.Literal("google_search_result"),
	result: Schema.Array(GeminiGoogleSearchResult),
	is_error: Schema.optional(Schema.Boolean),
	call_id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiGoogleSearchResultContent = typeof GeminiGoogleSearchResultContent.Type;

export const GeminiMcpServerToolCallContent = Schema.Struct({
	type: Schema.Literal("mcp_server_tool_call"),
	name: Schema.String,
	server_name: Schema.String,
	arguments: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
	id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiMcpServerToolCallContent = typeof GeminiMcpServerToolCallContent.Type;

export const GeminiMcpServerToolResultContent = Schema.Struct({
	type: Schema.Literal("mcp_server_tool_result"),
	name: Schema.optional(Schema.String),
	server_name: Schema.optional(Schema.String),
	result: Schema.Union(Schema.String, Schema.Array(GeminiFunctionResultSubcontent)),
	call_id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiMcpServerToolResultContent = typeof GeminiMcpServerToolResultContent.Type;

export const GeminiFileSearchCallContent = Schema.Struct({
	type: Schema.Literal("file_search_call"),
	id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiFileSearchCallContent = typeof GeminiFileSearchCallContent.Type;

export const GeminiFileSearchResult = Schema.Struct({
	text: Schema.String,
	file_search_store: Schema.optional(Schema.String),
});

export const GeminiFileSearchResultContent = Schema.Struct({
	type: Schema.Literal("file_search_result"),
	result: Schema.optional(Schema.Array(GeminiFileSearchResult)),
	call_id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiFileSearchResultContent = typeof GeminiFileSearchResultContent.Type;

export const GeminiGoogleMapsCallArguments = Schema.Struct({
	queries: Schema.Array(Schema.String),
});

export const GeminiGoogleMapsCallContent = Schema.Struct({
	type: Schema.Literal("google_maps_call"),
	arguments: Schema.optional(GeminiGoogleMapsCallArguments),
	id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiGoogleMapsCallContent = typeof GeminiGoogleMapsCallContent.Type;

export const GeminiReviewSnippet = Schema.Struct({
	title: Schema.optional(Schema.String),
	url: Schema.optional(Schema.String),
	review_id: Schema.optional(Schema.String),
});

export const GeminiPlace = Schema.Struct({
	place_id: Schema.optional(Schema.String),
	name: Schema.optional(Schema.String),
	url: Schema.optional(Schema.String),
	review_snippets: Schema.optional(Schema.Array(GeminiReviewSnippet)),
});

export const GeminiGoogleMapsResult = Schema.Struct({
	places: Schema.optional(Schema.Array(GeminiPlace)),
	widget_context_token: Schema.optional(Schema.String),
});

export const GeminiGoogleMapsResultContent = Schema.Struct({
	type: Schema.Literal("google_maps_result"),
	result: Schema.Array(GeminiGoogleMapsResult),
	is_error: Schema.optional(Schema.Boolean),
	call_id: Schema.String,
	signature: Schema.optional(Schema.String),
});
export type GeminiGoogleMapsResultContent = typeof GeminiGoogleMapsResultContent.Type;

export const GeminiContent = Schema.Union(
	GeminiTextContent,
	GeminiImageContent,
	GeminiAudioContent,
	GeminiDocumentContent,
	GeminiVideoContent,
	GeminiThoughtContent,
	GeminiFunctionCallContent,
	GeminiFunctionResultContent,
	GeminiCodeExecutionCallContent,
	GeminiCodeExecutionResultContent,
	GeminiUrlContextCallContent,
	GeminiUrlContextResultContent,
	GeminiGoogleSearchCallContent,
	GeminiGoogleSearchResultContent,
	GeminiMcpServerToolCallContent,
	GeminiMcpServerToolResultContent,
	GeminiFileSearchCallContent,
	GeminiFileSearchResultContent,
	GeminiGoogleMapsCallContent,
	GeminiGoogleMapsResultContent,
);
export type GeminiContent = typeof GeminiContent.Type;

export const GeminiAllowedTools = Schema.Struct({
	mode: Schema.optional(GeminiToolChoiceType),
	tools: Schema.optional(Schema.Array(Schema.String)),
});

export const GeminiFunctionTool = Schema.Struct({
	type: Schema.Literal("function"),
	name: Schema.String,
	description: Schema.optional(Schema.String),
	parameters: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});
export type GeminiFunctionTool = typeof GeminiFunctionTool.Type;

export const GeminiGoogleSearchTool = Schema.Struct({
	type: Schema.Literal("google_search"),
	search_types: Schema.optional(Schema.Array(Schema.Literal("web_search", "image_search"))),
});
export type GeminiGoogleSearchTool = typeof GeminiGoogleSearchTool.Type;

export const GeminiCodeExecutionTool = Schema.Struct({
	type: Schema.Literal("code_execution"),
});
export type GeminiCodeExecutionTool = typeof GeminiCodeExecutionTool.Type;

export const GeminiUrlContextTool = Schema.Struct({
	type: Schema.Literal("url_context"),
});
export type GeminiUrlContextTool = typeof GeminiUrlContextTool.Type;

export const GeminiComputerUseTool = Schema.Struct({
	type: Schema.Literal("computer_use"),
	environment: Schema.optional(Schema.Literal("browser")),
	excludedPredefinedFunctions: Schema.optional(Schema.Array(Schema.String)),
});
export type GeminiComputerUseTool = typeof GeminiComputerUseTool.Type;

export const GeminiMcpServerTool = Schema.Struct({
	type: Schema.Literal("mcp_server"),
	name: Schema.String,
	url: Schema.String,
	headers: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
	allowed_tools: Schema.optional(Schema.Array(GeminiAllowedTools)),
});
export type GeminiMcpServerTool = typeof GeminiMcpServerTool.Type;

export const GeminiFileSearchTool = Schema.Struct({
	type: Schema.Literal("file_search"),
	file_search_store_names: Schema.optional(Schema.Array(Schema.String)),
	top_k: Schema.optional(Schema.Int),
	metadata_filter: Schema.optional(Schema.String),
});
export type GeminiFileSearchTool = typeof GeminiFileSearchTool.Type;

export const GeminiGoogleMapsTool = Schema.Struct({
	type: Schema.Literal("google_maps"),
	enable_widget: Schema.optional(Schema.Boolean),
	latitude: Schema.optional(Schema.Number),
	longitude: Schema.optional(Schema.Number),
});
export type GeminiGoogleMapsTool = typeof GeminiGoogleMapsTool.Type;

export const GeminiTool = Schema.Union(
	GeminiFunctionTool,
	GeminiGoogleSearchTool,
	GeminiCodeExecutionTool,
	GeminiUrlContextTool,
	GeminiComputerUseTool,
	GeminiMcpServerTool,
	GeminiFileSearchTool,
	GeminiGoogleMapsTool,
);
export type GeminiTool = typeof GeminiTool.Type;

export const GeminiToolChoiceConfig = Schema.Union(
	GeminiToolChoiceType,
	Schema.Struct({
		mode: GeminiToolChoiceType,
		allowed_function_names: Schema.optional(Schema.Array(Schema.String)),
	}),
);
export type GeminiToolChoiceConfig = typeof GeminiToolChoiceConfig.Type;

export const GeminiSpeechConfig = Schema.Struct({
	voice: Schema.optional(Schema.String),
	language: Schema.optional(Schema.String),
	speaker: Schema.optional(Schema.String),
});

export const GeminiImageConfig = Schema.Struct({
	aspect_ratio: Schema.optional(
		Schema.Literal(
			"1:1",
			"2:3",
			"3:2",
			"3:4",
			"4:3",
			"4:5",
			"5:4",
			"9:16",
			"16:9",
			"21:9",
			"1:8",
			"8:1",
			"1:4",
			"4:1",
		),
	),
	image_size: Schema.optional(Schema.Literal("1K", "2K", "4K", "512")),
});

export const GeminiGenerationConfig = Schema.Struct({
	temperature: Schema.optional(Schema.Number),
	top_p: Schema.optional(Schema.Number),
	seed: Schema.optional(Schema.Int),
	stop_sequences: Schema.optional(Schema.Array(Schema.String)),
	thinking_level: Schema.optional(GeminiThinkingLevel),
	thinking_summaries: Schema.optional(GeminiThinkingSummaries),
	max_output_tokens: Schema.optional(Schema.Int),
	speech_config: Schema.optional(Schema.Array(GeminiSpeechConfig)),
	image_config: Schema.optional(GeminiImageConfig),
	tool_choice: Schema.optional(GeminiToolChoiceConfig),
});
export type GeminiGenerationConfig = typeof GeminiGenerationConfig.Type;

export const GeminiDeepResearchAgentConfig = Schema.Struct({
	type: Schema.Literal("deep-research"),
	thinking_summaries: Schema.optional(GeminiThinkingSummaries),
});

export const GeminiDynamicAgentConfig = Schema.Struct({
	type: Schema.Literal("dynamic"),
});

export const GeminiAgentConfig = Schema.Union(
	GeminiDeepResearchAgentConfig,
	GeminiDynamicAgentConfig,
);
export type GeminiAgentConfig = typeof GeminiAgentConfig.Type;

export const GeminiTurn = Schema.Struct({
	role: Schema.String,
	content: Schema.Union(Schema.String, Schema.Array(GeminiContent)),
});
export type GeminiTurn = typeof GeminiTurn.Type;

export const GeminiInteractionsInput = Schema.Union(
	Schema.String,
	Schema.Array(GeminiContent),
	Schema.Array(GeminiTurn),
);
export type GeminiInteractionsInput = typeof GeminiInteractionsInput.Type;

export const GeminiInteractionsCreateRequest = Schema.Struct({
	model: Schema.optional(GeminiModel),
	agent: Schema.optional(GeminiAgent),
	input: GeminiInteractionsInput,
	system_instruction: Schema.optional(Schema.String),
	tools: Schema.optional(Schema.Array(GeminiTool)),
	response_format: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	response_mime_type: Schema.optional(Schema.String),
	stream: Schema.optional(Schema.Boolean),
	store: Schema.optional(Schema.Boolean),
	background: Schema.optional(Schema.Boolean),
	generation_config: Schema.optional(GeminiGenerationConfig),
	agent_config: Schema.optional(GeminiAgentConfig),
	previous_interaction_id: Schema.optional(Schema.String),
	response_modalities: Schema.optional(Schema.Array(GeminiResponseModality)),
});
export type GeminiInteractionsCreateRequest = typeof GeminiInteractionsCreateRequest.Type;

export const GeminiInteractionStatus = Schema.Literal(
	"in_progress",
	"requires_action",
	"completed",
	"failed",
	"cancelled",
	"incomplete",
);
export type GeminiInteractionStatus = typeof GeminiInteractionStatus.Type;

export const GeminiModalityTokens = Schema.Struct({
	modality: GeminiResponseModality,
	tokens: Schema.Int,
});

export const GeminiUsage = Schema.Struct({
	total_input_tokens: Schema.optional(Schema.Int),
	input_tokens_by_modality: Schema.optional(Schema.Array(GeminiModalityTokens)),
	total_cached_tokens: Schema.optional(Schema.Int),
	cached_tokens_by_modality: Schema.optional(Schema.Array(GeminiModalityTokens)),
	total_output_tokens: Schema.optional(Schema.Int),
	output_tokens_by_modality: Schema.optional(Schema.Array(GeminiModalityTokens)),
	total_tool_use_tokens: Schema.optional(Schema.Int),
	tool_use_tokens_by_modality: Schema.optional(Schema.Array(GeminiModalityTokens)),
	total_thought_tokens: Schema.optional(Schema.Int),
	total_tokens: Schema.optional(Schema.Int),
});
export type GeminiUsage = typeof GeminiUsage.Type;

export const GeminiInteraction = Schema.Struct({
	id: Schema.String,
	object: Schema.optional(Schema.String),
	model: Schema.optional(GeminiModel),
	agent: Schema.optional(GeminiAgent),
	status: GeminiInteractionStatus,
	created: Schema.String,
	updated: Schema.String,
	role: Schema.optional(Schema.String),
	outputs: Schema.optional(Schema.Array(GeminiContent)),
	system_instruction: Schema.optional(Schema.String),
	tools: Schema.optional(Schema.Array(GeminiTool)),
	usage: Schema.optional(GeminiUsage),
	response_modalities: Schema.optional(Schema.Array(GeminiResponseModality)),
	response_format: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	response_mime_type: Schema.optional(Schema.String),
	previous_interaction_id: Schema.optional(Schema.String),
	input: Schema.optional(GeminiInteractionsInput),
	generation_config: Schema.optional(GeminiGenerationConfig),
	agent_config: Schema.optional(GeminiAgentConfig),
});
export type GeminiInteraction = typeof GeminiInteraction.Type;

export const GeminiTextDelta = Schema.Struct({
	type: Schema.Literal("text"),
	text: Schema.String,
	annotations: Schema.optional(Schema.Array(GeminiAnnotation)),
});

export const GeminiImageDelta = Schema.Struct({
	type: Schema.Literal("image"),
	data: Schema.optional(Schema.String),
	uri: Schema.optional(Schema.String),
	mime_type: Schema.optional(
		Schema.Literal("image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"),
	),
	resolution: Schema.optional(GeminiMediaResolution),
});

export const GeminiAudioDelta = Schema.Struct({
	type: Schema.Literal("audio"),
	data: Schema.optional(Schema.String),
	uri: Schema.optional(Schema.String),
	mime_type: Schema.optional(
		Schema.Literal("audio/wav", "audio/mp3", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac"),
	),
});

export const GeminiDocumentDelta = Schema.Struct({
	type: Schema.Literal("document"),
	data: Schema.optional(Schema.String),
	uri: Schema.optional(Schema.String),
	mime_type: Schema.optional(Schema.Literal("application/pdf")),
});

export const GeminiVideoDelta = Schema.Struct({
	type: Schema.Literal("video"),
	data: Schema.optional(Schema.String),
	uri: Schema.optional(Schema.String),
	mime_type: Schema.optional(
		Schema.Literal(
			"video/mp4",
			"video/mpeg",
			"video/mpg",
			"video/mov",
			"video/avi",
			"video/x-flv",
			"video/webm",
			"video/wmv",
			"video/3gpp",
		),
	),
	resolution: Schema.optional(GeminiMediaResolution),
});

export const GeminiThoughtSummaryDelta = Schema.Struct({
	type: Schema.Literal("thought_summary"),
	content: Schema.optional(GeminiThoughtSummaryContent),
});

export const GeminiThoughtSignatureDelta = Schema.Struct({
	type: Schema.Literal("thought_signature"),
	signature: Schema.String,
});

export const GeminiFunctionCallDelta = Schema.Struct({
	type: Schema.Literal("function_call"),
	name: Schema.optional(Schema.String),
	arguments: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiFunctionResultDelta = Schema.Struct({
	type: Schema.Literal("function_result"),
	name: Schema.optional(Schema.String),
	is_error: Schema.optional(Schema.Boolean),
	result: Schema.optional(
		Schema.Union(Schema.String, Schema.Array(GeminiFunctionResultSubcontent)),
	),
	call_id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiCodeExecutionCallDelta = Schema.Struct({
	type: Schema.Literal("code_execution_call"),
	arguments: Schema.optional(GeminiCodeExecutionCallArguments),
	id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiCodeExecutionResultDelta = Schema.Struct({
	type: Schema.Literal("code_execution_result"),
	result: Schema.optional(Schema.String),
	is_error: Schema.optional(Schema.Boolean),
	call_id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiUrlContextCallDelta = Schema.Struct({
	type: Schema.Literal("url_context_call"),
	arguments: Schema.optional(GeminiUrlContextCallArguments),
	id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiUrlContextResultDelta = Schema.Struct({
	type: Schema.Literal("url_context_result"),
	result: Schema.optional(Schema.Array(GeminiUrlContextResult)),
	is_error: Schema.optional(Schema.Boolean),
	call_id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiGoogleSearchCallDelta = Schema.Struct({
	type: Schema.Literal("google_search_call"),
	arguments: Schema.optional(GeminiGoogleSearchCallArguments),
	search_type: Schema.optional(Schema.Literal("web_search", "image_search")),
	id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiGoogleSearchResultDelta = Schema.Struct({
	type: Schema.Literal("google_search_result"),
	result: Schema.optional(Schema.Array(GeminiGoogleSearchResult)),
	is_error: Schema.optional(Schema.Boolean),
	call_id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiMcpServerToolCallDelta = Schema.Struct({
	type: Schema.Literal("mcp_server_tool_call"),
	name: Schema.optional(Schema.String),
	server_name: Schema.optional(Schema.String),
	arguments: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
	id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiMcpServerToolResultDelta = Schema.Struct({
	type: Schema.Literal("mcp_server_tool_result"),
	name: Schema.optional(Schema.String),
	server_name: Schema.optional(Schema.String),
	result: Schema.optional(
		Schema.Union(Schema.String, Schema.Array(GeminiFunctionResultSubcontent)),
	),
	is_error: Schema.optional(Schema.Boolean),
	call_id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiFileSearchCallDelta = Schema.Struct({
	type: Schema.Literal("file_search_call"),
	id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiFileSearchResultDelta = Schema.Struct({
	type: Schema.Literal("file_search_result"),
	result: Schema.optional(Schema.Array(GeminiFileSearchResult)),
	call_id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiGoogleMapsCallDelta = Schema.Struct({
	type: Schema.Literal("google_maps_call"),
	arguments: Schema.optional(GeminiGoogleMapsCallArguments),
	id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiGoogleMapsResultDelta = Schema.Struct({
	type: Schema.Literal("google_maps_result"),
	result: Schema.optional(Schema.Array(GeminiGoogleMapsResult)),
	is_error: Schema.optional(Schema.Boolean),
	call_id: Schema.optional(Schema.String),
	signature: Schema.optional(Schema.String),
});

export const GeminiDelta = Schema.Union(
	GeminiTextDelta,
	GeminiImageDelta,
	GeminiAudioDelta,
	GeminiDocumentDelta,
	GeminiVideoDelta,
	GeminiThoughtSummaryDelta,
	GeminiThoughtSignatureDelta,
	GeminiFunctionCallDelta,
	GeminiFunctionResultDelta,
	GeminiCodeExecutionCallDelta,
	GeminiCodeExecutionResultDelta,
	GeminiUrlContextCallDelta,
	GeminiUrlContextResultDelta,
	GeminiGoogleSearchCallDelta,
	GeminiGoogleSearchResultDelta,
	GeminiMcpServerToolCallDelta,
	GeminiMcpServerToolResultDelta,
	GeminiFileSearchCallDelta,
	GeminiFileSearchResultDelta,
	GeminiGoogleMapsCallDelta,
	GeminiGoogleMapsResultDelta,
);
export type GeminiDelta = typeof GeminiDelta.Type;

export const GeminiStreamError = Schema.Struct({
	code: Schema.optional(Schema.String),
	message: Schema.String,
});

export const GeminiStreamInteractionStart = Schema.Struct({
	event_type: Schema.Literal("interaction.start"),
	interaction: GeminiInteraction,
	event_id: Schema.optional(Schema.String),
});

export const GeminiStreamInteractionComplete = Schema.Struct({
	event_type: Schema.Literal("interaction.complete"),
	interaction: GeminiInteraction,
	event_id: Schema.optional(Schema.String),
});

export const GeminiStreamInteractionStatusUpdate = Schema.Struct({
	event_type: Schema.Literal("interaction.status_update"),
	interaction_id: Schema.String,
	status: GeminiInteractionStatus,
	event_id: Schema.optional(Schema.String),
});

export const GeminiStreamContentStart = Schema.Struct({
	event_type: Schema.Literal("content.start"),
	index: Schema.Int,
	content: GeminiContent,
	event_id: Schema.optional(Schema.String),
});

export const GeminiStreamContentDelta = Schema.Struct({
	event_type: Schema.Literal("content.delta"),
	index: Schema.Int,
	delta: GeminiDelta,
	event_id: Schema.optional(Schema.String),
});

export const GeminiStreamContentStop = Schema.Struct({
	event_type: Schema.Literal("content.stop"),
	index: Schema.Int,
	event_id: Schema.optional(Schema.String),
});

export const GeminiStreamError_ = Schema.Struct({
	event_type: Schema.Literal("error"),
	error: GeminiStreamError,
	event_id: Schema.optional(Schema.String),
});

export const GeminiStreamEvent = Schema.Union(
	GeminiStreamInteractionStart,
	GeminiStreamInteractionComplete,
	GeminiStreamInteractionStatusUpdate,
	GeminiStreamContentStart,
	GeminiStreamContentDelta,
	GeminiStreamContentStop,
	GeminiStreamError_,
);
export type GeminiStreamEvent = typeof GeminiStreamEvent.Type;
