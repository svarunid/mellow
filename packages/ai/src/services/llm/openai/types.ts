import { Schema } from "effect";

export const OpenAIModel = Schema.String;
export type OpenAIModel = typeof OpenAIModel.Type;

export const OpenAIMetadata = Schema.Record({
	key: Schema.String,
	value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
});
export type OpenAIMetadata = typeof OpenAIMetadata.Type;

export const OpenAIResponsesInputText = Schema.Struct({
	type: Schema.Literal("input_text"),
	text: Schema.String,
});
export type OpenAIResponsesInputText = typeof OpenAIResponsesInputText.Type;

export const OpenAIResponsesInputImage = Schema.Struct({
	type: Schema.Literal("input_image"),
	image_url: Schema.optional(Schema.String),
	file_id: Schema.optional(Schema.String),
	detail: Schema.optionalWith(Schema.Literal("auto", "original", "low", "high"), {
		default: () => "auto" as const,
	}),
});
export type OpenAIResponsesInputImage = typeof OpenAIResponsesInputImage.Type;

export const OpenAIResponsesInputFile = Schema.Struct({
	type: Schema.Literal("input_file"),
	file_id: Schema.optional(Schema.String),
	file_data: Schema.optional(Schema.String),
	file_url: Schema.optional(Schema.String),
	filename: Schema.optional(Schema.String),
});
export type OpenAIResponsesInputFile = typeof OpenAIResponsesInputFile.Type;

export const OpenAIResponsesInputContentPart = Schema.Union(
	OpenAIResponsesInputText,
	OpenAIResponsesInputImage,
	OpenAIResponsesInputFile,
);
export type OpenAIResponsesInputContentPart = typeof OpenAIResponsesInputContentPart.Type;

export const OpenAIFileCitation = Schema.Struct({
	type: Schema.Literal("file_citation"),
	file_id: Schema.String,
	filename: Schema.String,
	index: Schema.Number,
});
export type OpenAIFileCitation = typeof OpenAIFileCitation.Type;

export const OpenAIURLCitation = Schema.Struct({
	type: Schema.Literal("url_citation"),
	url: Schema.String,
	title: Schema.String,
	start_index: Schema.Number,
	end_index: Schema.Number,
});
export type OpenAIURLCitation = typeof OpenAIURLCitation.Type;

export const OpenAIContainerFileCitation = Schema.Struct({
	type: Schema.Literal("container_file_citation"),
	container_id: Schema.String,
	file_id: Schema.String,
	filename: Schema.String,
	start_index: Schema.Number,
	end_index: Schema.Number,
});
export type OpenAIContainerFileCitation = typeof OpenAIContainerFileCitation.Type;

export const OpenAIFilePath = Schema.Struct({
	type: Schema.Literal("file_path"),
	file_id: Schema.String,
	index: Schema.Number,
});
export type OpenAIFilePath = typeof OpenAIFilePath.Type;

export const OpenAIAnnotation = Schema.Union(
	OpenAIFileCitation,
	OpenAIURLCitation,
	OpenAIContainerFileCitation,
	OpenAIFilePath,
);
export type OpenAIAnnotation = typeof OpenAIAnnotation.Type;

export const OpenAILogprob = Schema.Struct({
	token: Schema.String,
	bytes: Schema.NullOr(Schema.Array(Schema.Number)),
	logprob: Schema.Number,
	top_logprobs: Schema.Array(
		Schema.Struct({
			token: Schema.String,
			bytes: Schema.NullOr(Schema.Array(Schema.Number)),
			logprob: Schema.Number,
		}),
	),
});
export type OpenAILogprob = typeof OpenAILogprob.Type;

export const OpenAIResponsesOutputText = Schema.Struct({
	type: Schema.Literal("output_text"),
	text: Schema.String,
	annotations: Schema.optional(Schema.Array(OpenAIAnnotation)),
	logprobs: Schema.optional(Schema.Array(OpenAILogprob)),
});
export type OpenAIResponsesOutputText = typeof OpenAIResponsesOutputText.Type;

export const OpenAIResponsesOutputRefusal = Schema.Struct({
	type: Schema.Literal("refusal"),
	refusal: Schema.String,
});
export type OpenAIResponsesOutputRefusal = typeof OpenAIResponsesOutputRefusal.Type;

export const OpenAIResponsesOutputContentPart = Schema.Union(
	OpenAIResponsesOutputText,
	OpenAIResponsesOutputRefusal,
);
export type OpenAIResponsesOutputContentPart = typeof OpenAIResponsesOutputContentPart.Type;

export const OpenAIResponsesInputMessage = Schema.Struct({
	type: Schema.optional(Schema.Literal("message")),
	role: Schema.Literal("system", "developer", "user", "assistant"),
	content: Schema.Union(Schema.String, Schema.Array(OpenAIResponsesInputContentPart)),
	phase: Schema.optional(Schema.Literal("commentary", "final_answer")),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesInputMessage = typeof OpenAIResponsesInputMessage.Type;

export const OpenAIResponsesOutputMessage = Schema.Struct({
	type: Schema.Literal("message"),
	id: Schema.String,
	role: Schema.Literal("assistant"),
	content: Schema.Array(OpenAIResponsesOutputContentPart),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
	phase: Schema.optional(Schema.Literal("commentary", "final_answer")),
});
export type OpenAIResponsesOutputMessage = typeof OpenAIResponsesOutputMessage.Type;

export const OpenAIResponsesFunction = Schema.Struct({
	type: Schema.Literal("function"),
	name: Schema.String,
	description: Schema.optional(Schema.String),
	parameters: Schema.Record({
		key: Schema.String,
		value: Schema.Unknown,
	}),
	strict: Schema.optional(Schema.Boolean),
	defer_loading: Schema.optional(Schema.Boolean),
});
export type OpenAIResponsesFunction = typeof OpenAIResponsesFunction.Type;

export const OpenAIResponsesWebSearchTool = Schema.Struct({
	type: Schema.Literal(
		"web_search",
		"web_search_2025_08_26",
		"web_search_preview",
		"web_search_preview_2025_03_11",
	),
	search_context_size: Schema.optional(Schema.Literal("low", "medium", "high")),
	user_location: Schema.optional(
		Schema.Struct({
			type: Schema.Literal("approximate"),
			city: Schema.optional(Schema.String),
			country: Schema.optional(Schema.String),
			region: Schema.optional(Schema.String),
			timezone: Schema.optional(Schema.String),
		}),
	),
	filters: Schema.optional(
		Schema.Struct({
			allowed_domains: Schema.optional(Schema.Array(Schema.String)),
		}),
	),
});
export type OpenAIResponsesWebSearchTool = typeof OpenAIResponsesWebSearchTool.Type;

export const OpenAIComparisonFilter = Schema.Struct({
	type: Schema.Literal("eq", "ne", "gt", "gte", "lt", "lte", "in", "nin"),
	key: Schema.String,
	value: Schema.Union(
		Schema.String,
		Schema.Number,
		Schema.Boolean,
		Schema.Array(Schema.Union(Schema.String, Schema.Number, Schema.Boolean)),
	),
});
export type OpenAIComparisonFilter = typeof OpenAIComparisonFilter.Type;

export const OpenAICompoundFilter = Schema.Struct({
	type: Schema.Literal("and", "or"),
	filters: Schema.Array(Schema.Unknown),
});
export type OpenAICompoundFilter = typeof OpenAICompoundFilter.Type;

export const OpenAIFileSearchRankingOptions = Schema.Struct({
	ranker: Schema.optional(Schema.String),
	score_threshold: Schema.optional(Schema.Number),
});
export type OpenAIFileSearchRankingOptions = typeof OpenAIFileSearchRankingOptions.Type;

export const OpenAIResponsesFileSearchTool = Schema.Struct({
	type: Schema.Literal("file_search"),
	vector_store_ids: Schema.Array(Schema.String),
	filters: Schema.optional(Schema.Union(OpenAIComparisonFilter, OpenAICompoundFilter)),
	max_num_results: Schema.optional(Schema.Number),
	ranking_options: Schema.optional(OpenAIFileSearchRankingOptions),
});
export type OpenAIResponsesFileSearchTool = typeof OpenAIResponsesFileSearchTool.Type;

export const OpenAIResponsesCodeInterpreterTool = Schema.Struct({
	type: Schema.Literal("code_interpreter"),
	container: Schema.optional(
		Schema.Union(
			Schema.String,
			Schema.Struct({
				type: Schema.Literal("auto"),
			}),
		),
	),
	file_ids: Schema.optional(Schema.Array(Schema.String)),
	memory_limit: Schema.optional(Schema.Literal("1g", "4g", "16g", "64g")),
	network_policy: Schema.optional(Schema.Unknown),
});
export type OpenAIResponsesCodeInterpreterTool = typeof OpenAIResponsesCodeInterpreterTool.Type;

export const OpenAIComputerAction = Schema.Union(
	Schema.Struct({
		type: Schema.Literal("click"),
		button: Schema.Literal("left", "right", "wheel", "back", "forward"),
		x: Schema.Number,
		y: Schema.Number,
	}),
	Schema.Struct({
		type: Schema.Literal("double_click"),
		x: Schema.Number,
		y: Schema.Number,
	}),
	Schema.Struct({
		type: Schema.Literal("drag"),
		path: Schema.Array(Schema.Struct({ x: Schema.Number, y: Schema.Number })),
	}),
	Schema.Struct({
		type: Schema.Literal("keypress"),
		keys: Schema.Array(Schema.String),
	}),
	Schema.Struct({
		type: Schema.Literal("move"),
		x: Schema.Number,
		y: Schema.Number,
	}),
	Schema.Struct({
		type: Schema.Literal("screenshot"),
	}),
	Schema.Struct({
		type: Schema.Literal("scroll"),
		x: Schema.Number,
		y: Schema.Number,
		scroll_x: Schema.Number,
		scroll_y: Schema.Number,
	}),
	Schema.Struct({
		type: Schema.Literal("type"),
		text: Schema.String,
	}),
	Schema.Struct({
		type: Schema.Literal("wait"),
	}),
);
export type OpenAIComputerAction = typeof OpenAIComputerAction.Type;

export const OpenAIResponsesComputerTool = Schema.Struct({
	type: Schema.Literal("computer", "computer_use_preview"),
	display_width: Schema.optional(Schema.Number),
	display_height: Schema.optional(Schema.Number),
	environment: Schema.optional(Schema.Literal("windows", "mac", "linux", "ubuntu", "browser")),
});
export type OpenAIResponsesComputerTool = typeof OpenAIResponsesComputerTool.Type;

export const OpenAIResponsesCustomTool = Schema.Struct({
	type: Schema.Literal("custom"),
	name: Schema.String,
	description: Schema.optional(Schema.String),
	format: Schema.optional(Schema.Literal("text", "grammar")),
	defer_loading: Schema.optional(Schema.Boolean),
});
export type OpenAIResponsesCustomTool = typeof OpenAIResponsesCustomTool.Type;

export const OpenAIResponsesMcpTool = Schema.Struct({
	type: Schema.Literal("mcp"),
	server_label: Schema.String,
	server_url: Schema.optional(Schema.String),
	connector_id: Schema.optional(
		Schema.Literal(
			"connector_dropbox",
			"connector_gmail",
			"connector_googlecalendar",
			"connector_googledrive",
			"connector_microsoftteams",
			"connector_outlookcalendar",
			"connector_outlookemail",
			"connector_sharepoint",
		),
	),
	allowed_tools: Schema.optional(Schema.Array(Schema.String)),
	authorization: Schema.optional(Schema.String),
	require_approval: Schema.optional(
		Schema.Union(
			Schema.Literal("always", "never"),
			Schema.Struct({
				always: Schema.optional(Schema.Array(Schema.Struct({ tool_name: Schema.String }))),
				never: Schema.optional(Schema.Array(Schema.Struct({ tool_name: Schema.String }))),
			}),
		),
	),
	headers: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
	defer_loading: Schema.optional(Schema.Boolean),
});
export type OpenAIResponsesMcpTool = typeof OpenAIResponsesMcpTool.Type;

export const OpenAIResponsesImageGenerationTool = Schema.Struct({
	type: Schema.Literal("image_generation"),
	model: Schema.optional(Schema.String),
	action: Schema.optional(Schema.Literal("generate", "edit", "auto")),
	quality: Schema.optional(Schema.Literal("low", "medium", "high", "auto")),
	size: Schema.optional(Schema.Literal("1024x1024", "1024x1536", "1536x1024", "auto")),
	output_format: Schema.optional(Schema.Literal("png", "webp", "jpeg")),
	background: Schema.optional(Schema.Literal("transparent", "opaque", "auto")),
	moderation: Schema.optional(Schema.Literal("auto", "low")),
	input_fidelity: Schema.optional(Schema.Literal("high", "low")),
	partial_images: Schema.optional(Schema.Number),
	output_compression: Schema.optional(Schema.Number),
	input_image_mask: Schema.optional(Schema.Unknown),
});
export type OpenAIResponsesImageGenerationTool = typeof OpenAIResponsesImageGenerationTool.Type;

export const OpenAIResponsesApplyPatchTool = Schema.Struct({
	type: Schema.Literal("apply_patch"),
});
export type OpenAIResponsesApplyPatchTool = typeof OpenAIResponsesApplyPatchTool.Type;

export const OpenAILocalEnvironment = Schema.Struct({
	type: Schema.Literal("local"),
	skills: Schema.optional(
		Schema.Array(
			Schema.Struct({
				name: Schema.String,
				description: Schema.String,
				path: Schema.String,
			}),
		),
	),
});
export type OpenAILocalEnvironment = typeof OpenAILocalEnvironment.Type;

export const OpenAIContainerReference = Schema.Struct({
	type: Schema.Literal("container_reference"),
	container_id: Schema.String,
});
export type OpenAIContainerReference = typeof OpenAIContainerReference.Type;

export const OpenAIContainerAuto = Schema.Struct({
	type: Schema.Literal("container_auto"),
	file_ids: Schema.optional(Schema.Array(Schema.String)),
	memory_limit: Schema.optional(Schema.Literal("1g", "4g", "16g", "64g")),
	network_policy: Schema.optional(Schema.Unknown),
	skills: Schema.optional(Schema.Array(Schema.Unknown)),
});
export type OpenAIContainerAuto = typeof OpenAIContainerAuto.Type;

export const OpenAIResponsesShellTool = Schema.Struct({
	type: Schema.Literal("shell"),
	environment: Schema.optional(
		Schema.Union(OpenAILocalEnvironment, OpenAIContainerReference, OpenAIContainerAuto),
	),
});
export type OpenAIResponsesShellTool = typeof OpenAIResponsesShellTool.Type;

export const OpenAIResponsesNamespace = Schema.Struct({
	type: Schema.Literal("namespace"),
	name: Schema.String,
	description: Schema.String,
	tools: Schema.Union(OpenAIResponsesFunction, Schema.Array(OpenAIResponsesFunction)),
});
export type OpenAIResponsesNamespace = typeof OpenAIResponsesNamespace.Type;

export const OpenAIResponsesToolSearchTool = Schema.Struct({
	type: Schema.Literal("tool_search"),
});
export type OpenAIResponsesToolSearchTool = typeof OpenAIResponsesToolSearchTool.Type;

export const OpenAIResponsesTool = Schema.Union(
	OpenAIResponsesFunction,
	OpenAIResponsesWebSearchTool,
	OpenAIResponsesFileSearchTool,
	OpenAIResponsesCodeInterpreterTool,
	OpenAIResponsesComputerTool,
	OpenAIResponsesCustomTool,
	OpenAIResponsesMcpTool,
	OpenAIResponsesImageGenerationTool,
	OpenAIResponsesApplyPatchTool,
	OpenAIResponsesShellTool,
	OpenAIResponsesNamespace,
	OpenAIResponsesToolSearchTool,
);
export type OpenAIResponsesTool = typeof OpenAIResponsesTool.Type;

export const OpenAIResponsesFunctionCall = Schema.Struct({
	type: Schema.Literal("function_call"),
	id: Schema.optional(Schema.String),
	call_id: Schema.String,
	name: Schema.String,
	namespace: Schema.optional(Schema.String),
	arguments: Schema.String,
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesFunctionCall = typeof OpenAIResponsesFunctionCall.Type;

export const OpenAIResponsesFunctionCallOutput = Schema.Struct({
	type: Schema.Literal("function_call_output"),
	id: Schema.optional(Schema.String),
	call_id: Schema.String,
	output: Schema.Union(Schema.String, Schema.Array(OpenAIResponsesInputContentPart)),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesFunctionCallOutput = typeof OpenAIResponsesFunctionCallOutput.Type;

export const OpenAIWebSearchAction = Schema.Union(
	Schema.Struct({
		type: Schema.Literal("search"),
		query: Schema.optional(Schema.String),
		queries: Schema.optional(Schema.Array(Schema.String)),
		sources: Schema.optional(
			Schema.Array(
				Schema.Struct({
					type: Schema.Literal("url"),
					url: Schema.String,
					title: Schema.optional(Schema.String),
				}),
			),
		),
	}),
	Schema.Struct({
		type: Schema.Literal("open_page"),
		url: Schema.optional(Schema.String),
	}),
	Schema.Struct({
		type: Schema.Literal("find_in_page"),
		url: Schema.String,
		pattern: Schema.String,
	}),
);
export type OpenAIWebSearchAction = typeof OpenAIWebSearchAction.Type;

export const OpenAIResponsesWebSearchCall = Schema.Struct({
	type: Schema.Literal("web_search_call"),
	id: Schema.String,
	action: OpenAIWebSearchAction,
	status: Schema.optional(Schema.Literal("in_progress", "searching", "completed", "failed")),
});
export type OpenAIResponsesWebSearchCall = typeof OpenAIResponsesWebSearchCall.Type;

export const OpenAIResponsesFileSearchCall = Schema.Struct({
	type: Schema.Literal("file_search_call"),
	id: Schema.String,
	queries: Schema.Array(Schema.String),
	status: Schema.optional(
		Schema.Literal("in_progress", "searching", "completed", "incomplete", "failed"),
	),
	results: Schema.optional(
		Schema.Array(
			Schema.Struct({
				attributes: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
				file_id: Schema.String,
				filename: Schema.String,
				text: Schema.String,
				score: Schema.Number,
			}),
		),
	),
});
export type OpenAIResponsesFileSearchCall = typeof OpenAIResponsesFileSearchCall.Type;

export const OpenAICodeInterpreterOutputLogs = Schema.Struct({
	type: Schema.Literal("logs"),
	logs: Schema.String,
});
export type OpenAICodeInterpreterOutputLogs = typeof OpenAICodeInterpreterOutputLogs.Type;

export const OpenAICodeInterpreterOutputImage = Schema.Struct({
	type: Schema.Literal("image"),
	url: Schema.String,
});
export type OpenAICodeInterpreterOutputImage = typeof OpenAICodeInterpreterOutputImage.Type;

export const OpenAIResponsesCodeInterpreterCall = Schema.Struct({
	type: Schema.Literal("code_interpreter_call"),
	id: Schema.String,
	code: Schema.String,
	container_id: Schema.String,
	outputs: Schema.Array(
		Schema.Union(OpenAICodeInterpreterOutputLogs, OpenAICodeInterpreterOutputImage),
	),
	status: Schema.optional(
		Schema.Literal("in_progress", "completed", "incomplete", "interpreting", "failed"),
	),
});
export type OpenAIResponsesCodeInterpreterCall = typeof OpenAIResponsesCodeInterpreterCall.Type;

export const OpenAIComputerScreenshot = Schema.Struct({
	type: Schema.Literal("computer_screenshot"),
	file_id: Schema.optional(Schema.String),
	image_url: Schema.optional(Schema.String),
});
export type OpenAIComputerScreenshot = typeof OpenAIComputerScreenshot.Type;

export const OpenAIPendingSafetyCheck = Schema.Struct({
	id: Schema.String,
	code: Schema.String,
	message: Schema.String,
});
export type OpenAIPendingSafetyCheck = typeof OpenAIPendingSafetyCheck.Type;

export const OpenAIResponsesComputerCall = Schema.Struct({
	type: Schema.Literal("computer_call"),
	id: Schema.String,
	call_id: Schema.String,
	action: OpenAIComputerAction,
	actions: Schema.optional(Schema.Array(OpenAIComputerAction)),
	pending_safety_checks: Schema.optional(Schema.Array(OpenAIPendingSafetyCheck)),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesComputerCall = typeof OpenAIResponsesComputerCall.Type;

export const OpenAIResponsesComputerCallOutput = Schema.Struct({
	type: Schema.Literal("computer_call_output"),
	id: Schema.optional(Schema.String),
	call_id: Schema.String,
	output: OpenAIComputerScreenshot,
	acknowledged_safety_checks: Schema.optional(Schema.Array(OpenAIPendingSafetyCheck)),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesComputerCallOutput = typeof OpenAIResponsesComputerCallOutput.Type;

export const OpenAIResponsesCustomToolCall = Schema.Struct({
	type: Schema.Literal("custom_tool_call"),
	id: Schema.optional(Schema.String),
	call_id: Schema.String,
	name: Schema.String,
	namespace: Schema.optional(Schema.String),
	input: Schema.String,
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesCustomToolCall = typeof OpenAIResponsesCustomToolCall.Type;

export const OpenAIResponsesCustomToolCallOutput = Schema.Struct({
	type: Schema.Literal("custom_tool_call_output"),
	id: Schema.optional(Schema.String),
	call_id: Schema.String,
	output: Schema.Union(Schema.String, Schema.Array(OpenAIResponsesInputContentPart)),
});
export type OpenAIResponsesCustomToolCallOutput = typeof OpenAIResponsesCustomToolCallOutput.Type;

export const OpenAIResponsesMcpCall = Schema.Struct({
	type: Schema.Literal("mcp_call"),
	id: Schema.String,
	server_label: Schema.String,
	name: Schema.String,
	arguments: Schema.String,
	output: Schema.optional(Schema.String),
	error: Schema.optional(Schema.String),
	approval_request_id: Schema.optional(Schema.String),
	status: Schema.optional(
		Schema.Literal("in_progress", "completed", "incomplete", "calling", "failed"),
	),
});
export type OpenAIResponsesMcpCall = typeof OpenAIResponsesMcpCall.Type;

export const OpenAIResponsesMcpApprovalRequest = Schema.Struct({
	type: Schema.Literal("mcp_approval_request"),
	id: Schema.String,
	server_label: Schema.String,
	name: Schema.String,
	arguments: Schema.String,
});
export type OpenAIResponsesMcpApprovalRequest = typeof OpenAIResponsesMcpApprovalRequest.Type;

export const OpenAIResponsesMcpApprovalResponse = Schema.Struct({
	type: Schema.Literal("mcp_approval_response"),
	id: Schema.optional(Schema.String),
	approval_request_id: Schema.String,
	approve: Schema.Boolean,
	reason: Schema.optional(Schema.String),
});
export type OpenAIResponsesMcpApprovalResponse = typeof OpenAIResponsesMcpApprovalResponse.Type;

export const OpenAIResponsesMcpListTools = Schema.Struct({
	type: Schema.Literal("mcp_list_tools"),
	id: Schema.String,
	server_label: Schema.String,
	tools: Schema.Array(
		Schema.Struct({
			name: Schema.String,
			input_schema: Schema.Unknown,
			description: Schema.optional(Schema.String),
			annotations: Schema.optional(Schema.Unknown),
		}),
	),
	error: Schema.optional(Schema.String),
});
export type OpenAIResponsesMcpListTools = typeof OpenAIResponsesMcpListTools.Type;

export const OpenAIResponsesLocalShellCall = Schema.Struct({
	type: Schema.Literal("local_shell_call"),
	id: Schema.String,
	call_id: Schema.String,
	action: Schema.Struct({
		type: Schema.Literal("exec"),
		command: Schema.Array(Schema.String),
		env: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
		timeout_ms: Schema.optional(Schema.Number),
		working_directory: Schema.optional(Schema.String),
		user: Schema.optional(Schema.String),
	}),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesLocalShellCall = typeof OpenAIResponsesLocalShellCall.Type;

export const OpenAIResponsesLocalShellCallOutput = Schema.Struct({
	type: Schema.Literal("local_shell_call_output"),
	id: Schema.String,
	output: Schema.String,
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesLocalShellCallOutput = typeof OpenAIResponsesLocalShellCallOutput.Type;

export const OpenAIResponsesShellCall = Schema.Struct({
	type: Schema.Literal("shell_call"),
	id: Schema.optional(Schema.String),
	call_id: Schema.String,
	action: Schema.Struct({
		commands: Schema.Array(Schema.String),
		timeout_ms: Schema.optional(Schema.Int),
		max_output_length: Schema.optional(Schema.Int),
	}),
	environment: Schema.optional(Schema.Union(OpenAILocalEnvironment, OpenAIContainerReference)),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesShellCall = typeof OpenAIResponsesShellCall.Type;

export const OpenAIResponsesShellCallOutput = Schema.Struct({
	type: Schema.Literal("shell_call_output"),
	id: Schema.optional(Schema.String),
	call_id: Schema.String,
	output: Schema.Array(
		Schema.Struct({
			outcome: Schema.Union(
				Schema.Struct({ type: Schema.Literal("timeout") }),
				Schema.Struct({
					type: Schema.Literal("exit"),
					exit_code: Schema.Int,
				}),
			),
			stderr: Schema.String,
			stdout: Schema.String,
		}),
	),
	max_output_length: Schema.optional(Schema.Int),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesShellCallOutput = typeof OpenAIResponsesShellCallOutput.Type;

export const OpenAIApplyPatchOperation = Schema.Union(
	Schema.Struct({
		type: Schema.Literal("create_file"),
		path: Schema.String,
		diff: Schema.String,
	}),
	Schema.Struct({
		type: Schema.Literal("delete_file"),
		path: Schema.String,
	}),
	Schema.Struct({
		type: Schema.Literal("update_file"),
		path: Schema.String,
		diff: Schema.String,
	}),
);
export type OpenAIApplyPatchOperation = typeof OpenAIApplyPatchOperation.Type;

export const OpenAIResponsesApplyPatchCall = Schema.Struct({
	type: Schema.Literal("apply_patch_call"),
	id: Schema.optional(Schema.String),
	call_id: Schema.String,
	operation: OpenAIApplyPatchOperation,
	status: Schema.optional(Schema.Literal("in_progress", "completed")),
});
export type OpenAIResponsesApplyPatchCall = typeof OpenAIResponsesApplyPatchCall.Type;

export const OpenAIResponsesApplyPatchCallOutput = Schema.Struct({
	type: Schema.Literal("apply_patch_call_output"),
	id: Schema.optional(Schema.String),
	call_id: Schema.String,
	output: Schema.optional(Schema.String),
	status: Schema.optional(Schema.Literal("completed", "failed")),
});
export type OpenAIResponsesApplyPatchCallOutput = typeof OpenAIResponsesApplyPatchCallOutput.Type;

export const OpenAIResponsesImageGenerationCall = Schema.Struct({
	type: Schema.Literal("image_generation_call"),
	id: Schema.String,
	result: Schema.optional(Schema.String),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "generating", "failed")),
});
export type OpenAIResponsesImageGenerationCall = typeof OpenAIResponsesImageGenerationCall.Type;

export const OpenAIResponsesToolSearchCall = Schema.Struct({
	type: Schema.Literal("tool_search_call"),
	id: Schema.optional(Schema.String),
	call_id: Schema.optional(Schema.String),
	arguments: Schema.Unknown,
	execution: Schema.optional(Schema.Literal("server", "client")),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesToolSearchCall = typeof OpenAIResponsesToolSearchCall.Type;

export const OpenAIResponsesToolSearchOutput = Schema.Struct({
	type: Schema.Literal("tool_search_output"),
	id: Schema.optional(Schema.String),
	call_id: Schema.optional(Schema.String),
	tools: Schema.Array(OpenAIResponsesTool),
	execution: Schema.optional(Schema.Literal("server", "client")),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesToolSearchOutput = typeof OpenAIResponsesToolSearchOutput.Type;

export const OpenAIResponsesSummaryText = Schema.Struct({
	type: Schema.Literal("summary_text"),
	text: Schema.String,
});
export type OpenAIResponsesSummaryText = typeof OpenAIResponsesSummaryText.Type;

export const OpenAIResponsesReasoningText = Schema.Struct({
	type: Schema.Literal("reasoning_text"),
	text: Schema.String,
});
export type OpenAIResponsesReasoningText = typeof OpenAIResponsesReasoningText.Type;

export const OpenAIResponsesReasoning = Schema.Struct({
	type: Schema.Literal("reasoning"),
	id: Schema.optional(Schema.String),
	summary: Schema.Array(OpenAIResponsesSummaryText),
	content: Schema.optional(Schema.Array(OpenAIResponsesReasoningText)),
	encrypted_content: Schema.optional(Schema.String),
	status: Schema.optional(Schema.Literal("in_progress", "completed", "incomplete")),
});
export type OpenAIResponsesReasoning = typeof OpenAIResponsesReasoning.Type;

export const OpenAIResponsesCompaction = Schema.Struct({
	type: Schema.Literal("compaction"),
	id: Schema.optional(Schema.String),
	encrypted_content: Schema.String,
});
export type OpenAIResponsesCompaction = typeof OpenAIResponsesCompaction.Type;

export const OpenAIResponsesItemReference = Schema.Struct({
	type: Schema.Literal("item_reference"),
	id: Schema.String,
});
export type OpenAIResponsesItemReference = typeof OpenAIResponsesItemReference.Type;

export const OpenAIResponsesInputItem = Schema.Union(
	OpenAIResponsesInputMessage,
	OpenAIResponsesOutputMessage,
	OpenAIResponsesFunctionCall,
	OpenAIResponsesFunctionCallOutput,
	OpenAIResponsesComputerCallOutput,
	OpenAIResponsesCustomToolCallOutput,
	OpenAIResponsesMcpApprovalResponse,
	OpenAIResponsesShellCall,
	OpenAIResponsesShellCallOutput,
	OpenAIResponsesLocalShellCallOutput,
	OpenAIResponsesApplyPatchCallOutput,
	OpenAIResponsesToolSearchCall,
	OpenAIResponsesToolSearchOutput,
	OpenAIResponsesReasoning,
	OpenAIResponsesCompaction,
	OpenAIResponsesItemReference,
);
export type OpenAIResponsesInputItem = typeof OpenAIResponsesInputItem.Type;

export const OpenAIResponsesInput = Schema.Union(
	Schema.String,
	Schema.Array(OpenAIResponsesInputItem),
);
export type OpenAIResponsesInput = typeof OpenAIResponsesInput.Type;

export const OpenAIResponsesOutputItem = Schema.Union(
	OpenAIResponsesOutputMessage,
	OpenAIResponsesFunctionCall,
	OpenAIResponsesWebSearchCall,
	OpenAIResponsesFileSearchCall,
	OpenAIResponsesCodeInterpreterCall,
	OpenAIResponsesComputerCall,
	OpenAIResponsesCustomToolCall,
	OpenAIResponsesMcpCall,
	OpenAIResponsesMcpApprovalRequest,
	OpenAIResponsesMcpListTools,
	OpenAIResponsesLocalShellCall,
	OpenAIResponsesShellCall,
	OpenAIResponsesShellCallOutput,
	OpenAIResponsesApplyPatchCall,
	OpenAIResponsesApplyPatchCallOutput,
	OpenAIResponsesImageGenerationCall,
	OpenAIResponsesToolSearchCall,
	OpenAIResponsesToolSearchOutput,
	OpenAIResponsesReasoning,
	OpenAIResponsesCompaction,
);
export type OpenAIResponsesOutputItem = typeof OpenAIResponsesOutputItem.Type;

export const OpenAIResponsesTextFormat = Schema.Union(
	Schema.Struct({
		type: Schema.Literal("text"),
	}),
	Schema.Struct({
		type: Schema.Literal("json_object"),
	}),
	Schema.Struct({
		type: Schema.Literal("json_schema"),
		name: Schema.String,
		schema: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
		description: Schema.optional(Schema.String),
		strict: Schema.optional(Schema.Boolean),
	}),
);
export type OpenAIResponsesTextFormat = typeof OpenAIResponsesTextFormat.Type;

export const OpenAIResponsesReasoningConfig = Schema.Struct({
	effort: Schema.optional(Schema.Literal("none", "minimal", "low", "medium", "high", "xhigh")),
	generate_summary: Schema.optional(Schema.Literal("auto", "concise", "detailed")),
	summary: Schema.optional(Schema.Literal("auto", "concise", "detailed")),
});
export type OpenAIResponsesReasoningConfig = typeof OpenAIResponsesReasoningConfig.Type;

export const OpenAIResponsesToolChoiceAllowed = Schema.Struct({
	type: Schema.Literal("allowed_tools"),
	mode: Schema.Literal("auto", "required"),
	tools: Schema.Array(
		Schema.Union(
			Schema.Struct({
				type: Schema.Literal("function"),
				name: Schema.String,
			}),
			Schema.Struct({
				type: Schema.Literal("mcp"),
				server_label: Schema.String,
				name: Schema.optional(Schema.String),
			}),
			Schema.Struct({
				type: Schema.Literal(
					"file_search",
					"web_search_preview",
					"computer",
					"computer_use_preview",
					"computer_use",
					"web_search_preview_2025_03_11",
					"image_generation",
					"code_interpreter",
				),
			}),
		),
	),
});
export type OpenAIResponsesToolChoiceAllowed = typeof OpenAIResponsesToolChoiceAllowed.Type;

export const OpenAIResponsesToolChoice = Schema.Union(
	Schema.Literal("auto", "none", "required"),
	Schema.Struct({
		type: Schema.Literal("function"),
		name: Schema.String,
	}),
	Schema.Struct({
		type: Schema.Literal(
			"file_search",
			"web_search_preview",
			"computer",
			"computer_use_preview",
			"computer_use",
			"web_search_preview_2025_03_11",
			"image_generation",
			"code_interpreter",
		),
	}),
	Schema.Struct({
		type: Schema.Literal("mcp"),
		server_label: Schema.String,
		name: Schema.optional(Schema.String),
	}),
	Schema.Struct({
		type: Schema.Literal("custom"),
		name: Schema.String,
	}),
	Schema.Struct({
		type: Schema.Literal("apply_patch"),
	}),
	Schema.Struct({
		type: Schema.Literal("shell"),
	}),
	OpenAIResponsesToolChoiceAllowed,
);
export type OpenAIResponsesToolChoice = typeof OpenAIResponsesToolChoice.Type;

export const OpenAIResponsesTruncation = Schema.Union(
	Schema.Literal("auto", "disabled"),
	Schema.Struct({
		type: Schema.Literal("auto"),
		max_tokens: Schema.optional(Schema.Number),
	}),
);
export type OpenAIResponsesTruncation = typeof OpenAIResponsesTruncation.Type;

export const OpenAIResponsesContextManagement = Schema.Struct({
	type: Schema.Literal("compaction"),
	compact_threshold: Schema.optional(Schema.Number),
});
export type OpenAIResponsesContextManagement = typeof OpenAIResponsesContextManagement.Type;

export const OpenAIResponsesPrompt = Schema.Struct({
	id: Schema.String,
	variables: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
	version: Schema.optional(Schema.String),
});
export type OpenAIResponsesPrompt = typeof OpenAIResponsesPrompt.Type;

export const OpenAIResponsesInclude = Schema.Literal(
	"web_search_call.action.sources",
	"web_search_call.results",
	"code_interpreter_call.outputs",
	"computer_call_output.output.image_url",
	"file_search_call.results",
	"message.input_image.image_url",
	"message.output_text.logprobs",
	"reasoning.encrypted_content",
);
export type OpenAIResponsesInclude = typeof OpenAIResponsesInclude.Type;

export const OpenAIResponsesRequest = Schema.Struct({
	model: OpenAIModel,
	input: Schema.optional(OpenAIResponsesInput),
	instructions: Schema.optional(Schema.String),
	tools: Schema.optional(Schema.Array(OpenAIResponsesTool)),
	tool_choice: Schema.optional(OpenAIResponsesToolChoice),
	temperature: Schema.optional(Schema.Number),
	top_p: Schema.optional(Schema.Number),
	max_output_tokens: Schema.optional(Schema.Number),
	max_tool_calls: Schema.optional(Schema.Number),
	metadata: Schema.optional(OpenAIMetadata),
	store: Schema.optional(Schema.Boolean),
	stream: Schema.optional(Schema.Boolean),
	parallel_tool_calls: Schema.optional(Schema.Boolean),
	previous_response_id: Schema.optional(Schema.String),
	reasoning: Schema.optional(OpenAIResponsesReasoningConfig),
	text: Schema.optional(
		Schema.Struct({
			format: Schema.optional(OpenAIResponsesTextFormat),
			verbosity: Schema.optional(Schema.Literal("low", "medium", "high")),
		}),
	),
	top_logprobs: Schema.optional(Schema.Number),
	truncation: Schema.optional(OpenAIResponsesTruncation),
	include: Schema.optional(Schema.Array(OpenAIResponsesInclude)),
	stream_options: Schema.optional(
		Schema.NullOr(
			Schema.Struct({
				include_usage: Schema.optional(Schema.Boolean),
			}),
		),
	),
	background: Schema.optional(Schema.Boolean),
	context_management: Schema.optional(Schema.Array(OpenAIResponsesContextManagement)),
	conversation: Schema.optional(
		Schema.Union(
			Schema.String,
			Schema.Struct({
				type: Schema.Literal("conversation"),
				id: Schema.String,
			}),
		),
	),
	prompt: Schema.optional(OpenAIResponsesPrompt),
	prompt_cache_key: Schema.optional(Schema.String),
	prompt_cache_retention: Schema.optional(Schema.Literal("in-memory", "24h")),
	safety_identifier: Schema.optional(Schema.String),
	service_tier: Schema.optional(Schema.Literal("auto", "default", "flex", "scale", "priority")),
	user: Schema.optional(Schema.String),
});
export type OpenAIResponsesRequest = typeof OpenAIResponsesRequest.Type;

export const OpenAIResponsesUsage = Schema.Struct({
	input_tokens: Schema.Int,
	output_tokens: Schema.Int,
	total_tokens: Schema.optional(Schema.Int),
	input_tokens_details: Schema.optional(
		Schema.Struct({
			cached_tokens: Schema.Int,
		}),
	),
	output_tokens_details: Schema.optional(
		Schema.Struct({
			reasoning_tokens: Schema.Int,
		}),
	),
});
export type OpenAIResponsesUsage = typeof OpenAIResponsesUsage.Type;

export const OpenAIResponsesError = Schema.Struct({
	type: Schema.String,
	code: Schema.String,
	message: Schema.String,
});
export type OpenAIResponsesError = typeof OpenAIResponsesError.Type;

export const OpenAIResponsesIncompleteDetails = Schema.Struct({
	reason: Schema.optional(
		Schema.Literal("max_output_tokens", "max_tool_calls", "content_filter", "max_turns"),
	),
});
export type OpenAIResponsesIncompleteDetails = typeof OpenAIResponsesIncompleteDetails.Type;

export const OpenAIResponsesResponse = Schema.Struct({
	id: Schema.String,
	object: Schema.Literal("response"),
	created_at: Schema.Number,
	model: Schema.String,
	output: Schema.Array(OpenAIResponsesOutputItem),
	status: Schema.Literal("in_progress", "completed", "incomplete", "failed", "cancelled", "queued"),
	background: Schema.optional(Schema.NullOr(Schema.Boolean)),
	completed_at: Schema.optional(Schema.NullOr(Schema.Number)),
	conversation: Schema.optional(
		Schema.NullOr(
			Schema.Struct({
				type: Schema.Literal("conversation"),
				id: Schema.String,
			}),
		),
	),
	error: Schema.optional(Schema.NullOr(OpenAIResponsesError)),
	incomplete_details: Schema.optional(Schema.NullOr(OpenAIResponsesIncompleteDetails)),
	instructions: Schema.optional(Schema.NullOr(Schema.String)),
	max_output_tokens: Schema.optional(Schema.NullOr(Schema.Number)),
	max_tool_calls: Schema.optional(Schema.NullOr(Schema.Number)),
	metadata: Schema.optional(Schema.NullOr(OpenAIMetadata)),
	parallel_tool_calls: Schema.optional(Schema.Boolean),
	previous_response_id: Schema.optional(Schema.NullOr(Schema.String)),
	prompt: Schema.optional(Schema.NullOr(OpenAIResponsesPrompt)),
	prompt_cache_key: Schema.optional(Schema.NullOr(Schema.String)),
	prompt_cache_retention: Schema.optional(Schema.NullOr(Schema.Literal("in-memory", "24h"))),
	reasoning: Schema.optional(Schema.NullOr(OpenAIResponsesReasoningConfig)),
	safety_identifier: Schema.optional(Schema.NullOr(Schema.String)),
	service_tier: Schema.optional(Schema.NullOr(Schema.String)),
	temperature: Schema.optional(Schema.NullOr(Schema.Number)),
	text: Schema.optional(
		Schema.Struct({
			format: Schema.optional(OpenAIResponsesTextFormat),
			verbosity: Schema.optional(Schema.Literal("low", "medium", "high")),
		}),
	),
	tool_choice: Schema.optional(OpenAIResponsesToolChoice),
	tools: Schema.optional(Schema.Array(OpenAIResponsesTool)),
	top_logprobs: Schema.optional(Schema.NullOr(Schema.Number)),
	top_p: Schema.optional(Schema.NullOr(Schema.Number)),
	truncation: Schema.optional(Schema.NullOr(OpenAIResponsesTruncation)),
	usage: Schema.optional(Schema.NullOr(OpenAIResponsesUsage)),
	user: Schema.optional(Schema.NullOr(Schema.String)),
});
export type OpenAIResponsesResponse = typeof OpenAIResponsesResponse.Type;

export const OpenAIResponsesStreamResponseCreated = Schema.Struct({
	type: Schema.Literal("response.created"),
	response: OpenAIResponsesResponse,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamResponseCreated = typeof OpenAIResponsesStreamResponseCreated.Type;

export const OpenAIResponsesStreamResponseInProgress = Schema.Struct({
	type: Schema.Literal("response.in_progress"),
	response: OpenAIResponsesResponse,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamResponseInProgress =
	typeof OpenAIResponsesStreamResponseInProgress.Type;

export const OpenAIResponsesStreamResponseCompleted = Schema.Struct({
	type: Schema.Literal("response.completed"),
	response: OpenAIResponsesResponse,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamResponseCompleted =
	typeof OpenAIResponsesStreamResponseCompleted.Type;

export const OpenAIResponsesStreamResponseFailed = Schema.Struct({
	type: Schema.Literal("response.failed"),
	response: OpenAIResponsesResponse,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamResponseFailed = typeof OpenAIResponsesStreamResponseFailed.Type;

export const OpenAIResponsesStreamResponseIncomplete = Schema.Struct({
	type: Schema.Literal("response.incomplete"),
	response: OpenAIResponsesResponse,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamResponseIncomplete =
	typeof OpenAIResponsesStreamResponseIncomplete.Type;

export const OpenAIResponsesStreamOutputItemAdded = Schema.Struct({
	type: Schema.Literal("response.output_item.added"),
	item: OpenAIResponsesOutputItem,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamOutputItemAdded = typeof OpenAIResponsesStreamOutputItemAdded.Type;

export const OpenAIResponsesStreamOutputItemDone = Schema.Struct({
	type: Schema.Literal("response.output_item.done"),
	item: OpenAIResponsesOutputItem,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamOutputItemDone = typeof OpenAIResponsesStreamOutputItemDone.Type;

export const OpenAIResponsesStreamContentPartAdded = Schema.Struct({
	type: Schema.Literal("response.content_part.added"),
	part: OpenAIResponsesOutputContentPart,
	content_index: Schema.Int,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamContentPartAdded =
	typeof OpenAIResponsesStreamContentPartAdded.Type;

export const OpenAIResponsesStreamContentPartDone = Schema.Struct({
	type: Schema.Literal("response.content_part.done"),
	part: OpenAIResponsesOutputContentPart,
	content_index: Schema.Int,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamContentPartDone = typeof OpenAIResponsesStreamContentPartDone.Type;

export const OpenAIResponsesStreamOutputTextDelta = Schema.Struct({
	type: Schema.Literal("response.output_text.delta"),
	delta: Schema.String,
	content_index: Schema.Int,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamOutputTextDelta = typeof OpenAIResponsesStreamOutputTextDelta.Type;

export const OpenAIResponsesStreamOutputTextDone = Schema.Struct({
	type: Schema.Literal("response.output_text.done"),
	text: Schema.String,
	content_index: Schema.Int,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamOutputTextDone = typeof OpenAIResponsesStreamOutputTextDone.Type;

export const OpenAIResponsesStreamOutputTextAnnotationAdded = Schema.Struct({
	type: Schema.Literal("response.output_text.annotation.added"),
	annotation: OpenAIAnnotation,
	annotation_index: Schema.Int,
	content_index: Schema.Int,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamOutputTextAnnotationAdded =
	typeof OpenAIResponsesStreamOutputTextAnnotationAdded.Type;

export const OpenAIResponsesStreamRefusalDelta = Schema.Struct({
	type: Schema.Literal("response.refusal.delta"),
	delta: Schema.String,
	content_index: Schema.Int,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamRefusalDelta = typeof OpenAIResponsesStreamRefusalDelta.Type;

export const OpenAIResponsesStreamRefusalDone = Schema.Struct({
	type: Schema.Literal("response.refusal.done"),
	refusal: Schema.String,
	content_index: Schema.Int,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamRefusalDone = typeof OpenAIResponsesStreamRefusalDone.Type;

export const OpenAIResponsesStreamFunctionCallArgumentsDelta = Schema.Struct({
	type: Schema.Literal("response.function_call_arguments.delta"),
	delta: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamFunctionCallArgumentsDelta =
	typeof OpenAIResponsesStreamFunctionCallArgumentsDelta.Type;

export const OpenAIResponsesStreamFunctionCallArgumentsDone = Schema.Struct({
	type: Schema.Literal("response.function_call_arguments.done"),
	arguments: Schema.String,
	call_id: Schema.String,
	name: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamFunctionCallArgumentsDone =
	typeof OpenAIResponsesStreamFunctionCallArgumentsDone.Type;

export const OpenAIResponsesStreamFileSearchCallInProgress = Schema.Struct({
	type: Schema.Literal("response.file_search_call.in_progress"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamFileSearchCallInProgress =
	typeof OpenAIResponsesStreamFileSearchCallInProgress.Type;

export const OpenAIResponsesStreamFileSearchCallSearching = Schema.Struct({
	type: Schema.Literal("response.file_search_call.searching"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamFileSearchCallSearching =
	typeof OpenAIResponsesStreamFileSearchCallSearching.Type;

export const OpenAIResponsesStreamFileSearchCallCompleted = Schema.Struct({
	type: Schema.Literal("response.file_search_call.completed"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamFileSearchCallCompleted =
	typeof OpenAIResponsesStreamFileSearchCallCompleted.Type;

export const OpenAIResponsesStreamWebSearchCallInProgress = Schema.Struct({
	type: Schema.Literal("response.web_search_call.in_progress"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamWebSearchCallInProgress =
	typeof OpenAIResponsesStreamWebSearchCallInProgress.Type;

export const OpenAIResponsesStreamWebSearchCallSearching = Schema.Struct({
	type: Schema.Literal("response.web_search_call.searching"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamWebSearchCallSearching =
	typeof OpenAIResponsesStreamWebSearchCallSearching.Type;

export const OpenAIResponsesStreamWebSearchCallCompleted = Schema.Struct({
	type: Schema.Literal("response.web_search_call.completed"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamWebSearchCallCompleted =
	typeof OpenAIResponsesStreamWebSearchCallCompleted.Type;

export const OpenAIResponsesStreamCodeInterpreterCallInProgress = Schema.Struct({
	type: Schema.Literal("response.code_interpreter_call.in_progress"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamCodeInterpreterCallInProgress =
	typeof OpenAIResponsesStreamCodeInterpreterCallInProgress.Type;

export const OpenAIResponsesStreamCodeInterpreterCallCodeDelta = Schema.Struct({
	type: Schema.Literal("response.code_interpreter_call.code.delta"),
	delta: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamCodeInterpreterCallCodeDelta =
	typeof OpenAIResponsesStreamCodeInterpreterCallCodeDelta.Type;

export const OpenAIResponsesStreamCodeInterpreterCallCodeDone = Schema.Struct({
	type: Schema.Literal("response.code_interpreter_call.code.done"),
	code: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamCodeInterpreterCallCodeDone =
	typeof OpenAIResponsesStreamCodeInterpreterCallCodeDone.Type;

export const OpenAIResponsesStreamCodeInterpreterCallInterpreting = Schema.Struct({
	type: Schema.Literal("response.code_interpreter_call.interpreting"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamCodeInterpreterCallInterpreting =
	typeof OpenAIResponsesStreamCodeInterpreterCallInterpreting.Type;

export const OpenAIResponsesStreamCodeInterpreterCallCompleted = Schema.Struct({
	type: Schema.Literal("response.code_interpreter_call.completed"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamCodeInterpreterCallCompleted =
	typeof OpenAIResponsesStreamCodeInterpreterCallCompleted.Type;

export const OpenAIResponsesStreamReasoningSummaryPartAdded = Schema.Struct({
	type: Schema.Literal("response.reasoning_summary_part.added"),
	part: OpenAIResponsesSummaryText,
	item_id: Schema.String,
	output_index: Schema.Int,
	summary_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamReasoningSummaryPartAdded =
	typeof OpenAIResponsesStreamReasoningSummaryPartAdded.Type;

export const OpenAIResponsesStreamReasoningSummaryPartDone = Schema.Struct({
	type: Schema.Literal("response.reasoning_summary_part.done"),
	part: OpenAIResponsesSummaryText,
	item_id: Schema.String,
	output_index: Schema.Int,
	summary_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamReasoningSummaryPartDone =
	typeof OpenAIResponsesStreamReasoningSummaryPartDone.Type;

export const OpenAIResponsesStreamReasoningSummaryTextDelta = Schema.Struct({
	type: Schema.Literal("response.reasoning_summary_text.delta"),
	delta: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	summary_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamReasoningSummaryTextDelta =
	typeof OpenAIResponsesStreamReasoningSummaryTextDelta.Type;

export const OpenAIResponsesStreamReasoningSummaryTextDone = Schema.Struct({
	type: Schema.Literal("response.reasoning_summary_text.done"),
	text: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	summary_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamReasoningSummaryTextDone =
	typeof OpenAIResponsesStreamReasoningSummaryTextDone.Type;

export const OpenAIResponsesStreamImageGenerationCallInProgress = Schema.Struct({
	type: Schema.Literal("response.image_generation_call.in_progress"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamImageGenerationCallInProgress =
	typeof OpenAIResponsesStreamImageGenerationCallInProgress.Type;

export const OpenAIResponsesStreamImageGenerationCallGenerating = Schema.Struct({
	type: Schema.Literal("response.image_generation_call.generating"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamImageGenerationCallGenerating =
	typeof OpenAIResponsesStreamImageGenerationCallGenerating.Type;

export const OpenAIResponsesStreamImageGenerationCallPartialImage = Schema.Struct({
	type: Schema.Literal("response.image_generation_call.partial_image"),
	partial_image: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamImageGenerationCallPartialImage =
	typeof OpenAIResponsesStreamImageGenerationCallPartialImage.Type;

export const OpenAIResponsesStreamImageGenerationCallCompleted = Schema.Struct({
	type: Schema.Literal("response.image_generation_call.completed"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamImageGenerationCallCompleted =
	typeof OpenAIResponsesStreamImageGenerationCallCompleted.Type;

export const OpenAIResponsesStreamMcpCallInProgress = Schema.Struct({
	type: Schema.Literal("response.mcp_call.in_progress"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamMcpCallInProgress =
	typeof OpenAIResponsesStreamMcpCallInProgress.Type;

export const OpenAIResponsesStreamMcpCallArgumentsDelta = Schema.Struct({
	type: Schema.Literal("response.mcp_call.arguments.delta"),
	delta: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamMcpCallArgumentsDelta =
	typeof OpenAIResponsesStreamMcpCallArgumentsDelta.Type;

export const OpenAIResponsesStreamMcpCallArgumentsDone = Schema.Struct({
	type: Schema.Literal("response.mcp_call.arguments.done"),
	arguments: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamMcpCallArgumentsDone =
	typeof OpenAIResponsesStreamMcpCallArgumentsDone.Type;

export const OpenAIResponsesStreamMcpCallCompleted = Schema.Struct({
	type: Schema.Literal("response.mcp_call.completed"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamMcpCallCompleted =
	typeof OpenAIResponsesStreamMcpCallCompleted.Type;

export const OpenAIResponsesStreamMcpCallFailed = Schema.Struct({
	type: Schema.Literal("response.mcp_call.failed"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamMcpCallFailed = typeof OpenAIResponsesStreamMcpCallFailed.Type;

export const OpenAIResponsesStreamMcpListToolsInProgress = Schema.Struct({
	type: Schema.Literal("response.mcp_list_tools.in_progress"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamMcpListToolsInProgress =
	typeof OpenAIResponsesStreamMcpListToolsInProgress.Type;

export const OpenAIResponsesStreamMcpListToolsCompleted = Schema.Struct({
	type: Schema.Literal("response.mcp_list_tools.completed"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamMcpListToolsCompleted =
	typeof OpenAIResponsesStreamMcpListToolsCompleted.Type;

export const OpenAIResponsesStreamMcpListToolsFailed = Schema.Struct({
	type: Schema.Literal("response.mcp_list_tools.failed"),
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamMcpListToolsFailed =
	typeof OpenAIResponsesStreamMcpListToolsFailed.Type;

export const OpenAIResponsesStreamResponseQueued = Schema.Struct({
	type: Schema.Literal("response.queued"),
	response: OpenAIResponsesResponse,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamResponseQueued = typeof OpenAIResponsesStreamResponseQueued.Type;

export const OpenAIResponsesStreamAudioDelta = Schema.Struct({
	type: Schema.Literal("response.audio.delta"),
	delta: Schema.String,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamAudioDelta = typeof OpenAIResponsesStreamAudioDelta.Type;

export const OpenAIResponsesStreamAudioDone = Schema.Struct({
	type: Schema.Literal("response.audio.done"),
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamAudioDone = typeof OpenAIResponsesStreamAudioDone.Type;

export const OpenAIResponsesStreamAudioTranscriptDelta = Schema.Struct({
	type: Schema.Literal("response.audio.transcript.delta"),
	delta: Schema.String,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamAudioTranscriptDelta =
	typeof OpenAIResponsesStreamAudioTranscriptDelta.Type;

export const OpenAIResponsesStreamAudioTranscriptDone = Schema.Struct({
	type: Schema.Literal("response.audio.transcript.done"),
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamAudioTranscriptDone =
	typeof OpenAIResponsesStreamAudioTranscriptDone.Type;

export const OpenAIResponsesStreamReasoningTextDelta = Schema.Struct({
	type: Schema.Literal("response.reasoning_text.delta"),
	delta: Schema.String,
	content_index: Schema.Int,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamReasoningTextDelta =
	typeof OpenAIResponsesStreamReasoningTextDelta.Type;

export const OpenAIResponsesStreamReasoningTextDone = Schema.Struct({
	type: Schema.Literal("response.reasoning_text.done"),
	text: Schema.String,
	content_index: Schema.Int,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamReasoningTextDone =
	typeof OpenAIResponsesStreamReasoningTextDone.Type;

export const OpenAIResponsesStreamCustomToolCallInputDelta = Schema.Struct({
	type: Schema.Literal("response.custom_tool_call_input.delta"),
	delta: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamCustomToolCallInputDelta =
	typeof OpenAIResponsesStreamCustomToolCallInputDelta.Type;

export const OpenAIResponsesStreamCustomToolCallInputDone = Schema.Struct({
	type: Schema.Literal("response.custom_tool_call_input.done"),
	input: Schema.String,
	item_id: Schema.String,
	output_index: Schema.Int,
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamCustomToolCallInputDone =
	typeof OpenAIResponsesStreamCustomToolCallInputDone.Type;

export const OpenAIResponsesStreamError = Schema.Struct({
	type: Schema.Literal("error"),
	code: Schema.NullOr(Schema.String),
	message: Schema.String,
	param: Schema.NullOr(Schema.String),
	sequence_number: Schema.Int,
});
export type OpenAIResponsesStreamError = typeof OpenAIResponsesStreamError.Type;

export const OpenAIResponsesStreamEvent = Schema.Union(
	OpenAIResponsesStreamResponseCreated,
	OpenAIResponsesStreamResponseInProgress,
	OpenAIResponsesStreamResponseCompleted,
	OpenAIResponsesStreamResponseFailed,
	OpenAIResponsesStreamResponseIncomplete,
	OpenAIResponsesStreamResponseQueued,
	OpenAIResponsesStreamOutputItemAdded,
	OpenAIResponsesStreamOutputItemDone,
	OpenAIResponsesStreamContentPartAdded,
	OpenAIResponsesStreamContentPartDone,
	OpenAIResponsesStreamOutputTextDelta,
	OpenAIResponsesStreamOutputTextDone,
	OpenAIResponsesStreamOutputTextAnnotationAdded,
	OpenAIResponsesStreamRefusalDelta,
	OpenAIResponsesStreamRefusalDone,
	OpenAIResponsesStreamFunctionCallArgumentsDelta,
	OpenAIResponsesStreamFunctionCallArgumentsDone,
	OpenAIResponsesStreamFileSearchCallInProgress,
	OpenAIResponsesStreamFileSearchCallSearching,
	OpenAIResponsesStreamFileSearchCallCompleted,
	OpenAIResponsesStreamWebSearchCallInProgress,
	OpenAIResponsesStreamWebSearchCallSearching,
	OpenAIResponsesStreamWebSearchCallCompleted,
	OpenAIResponsesStreamCodeInterpreterCallInProgress,
	OpenAIResponsesStreamCodeInterpreterCallCodeDelta,
	OpenAIResponsesStreamCodeInterpreterCallCodeDone,
	OpenAIResponsesStreamCodeInterpreterCallInterpreting,
	OpenAIResponsesStreamCodeInterpreterCallCompleted,
	OpenAIResponsesStreamReasoningSummaryPartAdded,
	OpenAIResponsesStreamReasoningSummaryPartDone,
	OpenAIResponsesStreamReasoningSummaryTextDelta,
	OpenAIResponsesStreamReasoningSummaryTextDone,
	OpenAIResponsesStreamReasoningTextDelta,
	OpenAIResponsesStreamReasoningTextDone,
	OpenAIResponsesStreamImageGenerationCallInProgress,
	OpenAIResponsesStreamImageGenerationCallGenerating,
	OpenAIResponsesStreamImageGenerationCallPartialImage,
	OpenAIResponsesStreamImageGenerationCallCompleted,
	OpenAIResponsesStreamMcpCallInProgress,
	OpenAIResponsesStreamMcpCallArgumentsDelta,
	OpenAIResponsesStreamMcpCallArgumentsDone,
	OpenAIResponsesStreamMcpCallCompleted,
	OpenAIResponsesStreamMcpCallFailed,
	OpenAIResponsesStreamMcpListToolsInProgress,
	OpenAIResponsesStreamMcpListToolsCompleted,
	OpenAIResponsesStreamMcpListToolsFailed,
	OpenAIResponsesStreamAudioDelta,
	OpenAIResponsesStreamAudioDone,
	OpenAIResponsesStreamAudioTranscriptDelta,
	OpenAIResponsesStreamAudioTranscriptDone,
	OpenAIResponsesStreamCustomToolCallInputDelta,
	OpenAIResponsesStreamCustomToolCallInputDone,
	OpenAIResponsesStreamError,
);
export type OpenAIResponsesStreamEvent = typeof OpenAIResponsesStreamEvent.Type;
