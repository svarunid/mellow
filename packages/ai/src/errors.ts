import { Data } from "effect";

export class InputValidationError extends Data.TaggedError("InputValidationError")<{
	readonly message: string;
	readonly param?: string;
}> {}

export class AuthenticationError extends Data.TaggedError("AuthenticationError")<{
	readonly message: string;
}> {}

export class BillingError extends Data.TaggedError("BillingError")<{
	readonly message: string;
}> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
	readonly message: string;
	readonly retryAfterMs?: number;
}> {}

export class ContentPolicyError extends Data.TaggedError("ContentPolicyError")<{
	readonly message: string;
}> {}

export class ContextLengthError extends Data.TaggedError("ContextLengthError")<{
	readonly message: string;
	readonly maxTokens?: number;
}> {}

export class ModelNotFoundError extends Data.TaggedError("ModelNotFoundError")<{
	readonly message: string;
	readonly model: string;
}> {}

export class ToolExecutionError extends Data.TaggedError("ToolExecutionError")<{
	readonly message: string;
	readonly toolName: string;
	readonly cause?: unknown;
}> {}

export class StreamError extends Data.TaggedError("StreamError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

export class ProviderError extends Data.TaggedError("ProviderError")<{
	readonly message: string;
	readonly provider: "anthropic" | "openai" | "google";
	readonly code?: string;
	readonly statusCode?: number;
	readonly cause?: unknown;
}> {}

export type LLMError =
	| InputValidationError
	| AuthenticationError
	| BillingError
	| RateLimitError
	| ContentPolicyError
	| ContextLengthError
	| ModelNotFoundError
	| ToolExecutionError
	| StreamError
	| ProviderError;
