import { Schema } from "effect";

export const UrlAnnotation = Schema.Struct({
	type: Schema.Literal("url"),
	url: Schema.String,
	title: Schema.optional(Schema.String),
	citedText: Schema.optional(Schema.String),
	startIndex: Schema.optional(Schema.Int),
	endIndex: Schema.optional(Schema.Int),
});
export type UrlAnnotation = typeof UrlAnnotation.Type;

export const DocumentAnnotation = Schema.Struct({
	type: Schema.Literal("document"),
	documentIndex: Schema.Int,
	documentTitle: Schema.String,
	citedText: Schema.String,
});
export type DocumentAnnotation = typeof DocumentAnnotation.Type;

export const FileAnnotation = Schema.Struct({
	type: Schema.Literal("file"),
	fileId: Schema.String,
	filename: Schema.optional(Schema.String),
});
export type FileAnnotation = typeof FileAnnotation.Type;

export const Annotation = Schema.Union(UrlAnnotation, DocumentAnnotation, FileAnnotation);
export type Annotation = typeof Annotation.Type;

export const Base64Source = Schema.Struct({
	type: Schema.Literal("base64"),
	data: Schema.String,
	mediaType: Schema.String,
});
export type Base64Source = typeof Base64Source.Type;

export const UrlSource = Schema.Struct({
	type: Schema.Literal("url"),
	url: Schema.String,
});
export type UrlSource = typeof UrlSource.Type;

export const MediaSource = Schema.Union(Base64Source, UrlSource);
export type MediaSource = typeof MediaSource.Type;

export const TextContent = Schema.Struct({
	type: Schema.Literal("text"),
	text: Schema.String,
	annotations: Schema.optional(Schema.Array(Annotation)),
});
export type TextContent = typeof TextContent.Type;

export const ImageContent = Schema.Struct({
	type: Schema.Literal("image"),
	source: MediaSource,
});
export type ImageContent = typeof ImageContent.Type;

export const AudioContent = Schema.Struct({
	type: Schema.Literal("audio"),
	source: MediaSource,
});
export type AudioContent = typeof AudioContent.Type;

export const DocumentContent = Schema.Struct({
	type: Schema.Literal("document"),
	source: MediaSource,
	title: Schema.optional(Schema.String),
});
export type DocumentContent = typeof DocumentContent.Type;

export const VideoContent = Schema.Struct({
	type: Schema.Literal("video"),
	source: MediaSource,
});
export type VideoContent = typeof VideoContent.Type;

export const ContentBlock = Schema.Union(
	TextContent,
	ImageContent,
	AudioContent,
	DocumentContent,
	VideoContent,
);
export type ContentBlock = typeof ContentBlock.Type;
