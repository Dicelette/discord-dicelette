import { ChatBubbleOutlined, Tag } from "@mui/icons-material";
import { Box, Link, type SxProps, type Theme } from "@mui/material";
import { parse } from "discord-markdown-parser";
import { Fragment, type ReactNode, useMemo } from "react";
import { type Locale, useI18n } from "../i18n";

/**
 * Renders Discord-flavored markdown (the exact output of the bot's roll
 * formatter) into styled React, as a visual counterpart to the raw "code"
 * view. Parsing is delegated to `discord-markdown-parser` (an AST), and each
 * node type is mapped to a MUI-styled element here so we control the look and
 * can render Discord-specific tokens (`<t:…>` timestamps, `<@id>` mentions) the
 * way the client would.
 */

/** Loose shape of a `discord-markdown-parser` AST node. */
type MdNode = {
	type: string;
	content?: string | MdNode[];
	target?: string;
	timestamp?: string;
	format?: string;
	lang?: string;
	id?: string;
	/** Unicode emoji glyph for `twemoji` nodes (e.g. the `↪` reply arrow). */
	name?: string;
};

/** Rendering context threaded through the recursive renderer. */
type Ctx = {
	locale: Locale;
	/** Maps a mentioned user id to a display name (no real users to resolve). */
	mentions?: Record<string, string>;
	/** Maps a channel id to a display name (no real channels to resolve). */
	channels?: Record<string, string>;
	/** Maps a thread channel id to a name; rendered with a thread-style pill. */
	threads?: Record<string, string>;
};

const inlineCodeSx: SxProps<Theme> = {
	fontFamily: '"Victor Mono Variable", monospace',
	bgcolor: "action.hover",
	px: 0.5,
	py: 0.1,
	borderRadius: 0.5,
	fontSize: "0.9em",
};

const codeBlockSx: SxProps<Theme> = {
	fontFamily: '"Victor Mono Variable", monospace',
	bgcolor: "action.hover",
	p: 1.5,
	borderRadius: 1,
	overflowX: "auto",
	my: 0.5,
};

const quoteSx: SxProps<Theme> = {
	borderLeft: "4px solid",
	borderColor: "divider",
	pl: 1.5,
	my: 0.5,
	color: "text.secondary",
};

const timestampSx: SxProps<Theme> = {
	bgcolor: "action.selected",
	borderRadius: 0.5,
	px: 0.5,
	py: 0.1,
	whiteSpace: "nowrap",
};

const spoilerSx: SxProps<Theme> = {
	bgcolor: "text.primary",
	borderRadius: 0.5,
	px: 0.5,
	color: "transparent",
	transition: "color 0.1s",
	"&:hover": { color: "background.paper" },
};

const mentionSx: SxProps<Theme> = {
	bgcolor: (theme) =>
		`color-mix(in srgb, ${theme.palette.primary.main} 22%, transparent)`,
	color: "primary.main",
	borderRadius: 0.5,
	px: 0.5,
	fontWeight: 500,
	whiteSpace: "nowrap",
};

const localeTag = (locale: Locale) => (locale === "fr" ? "fr-FR" : "en-US");

/** Formats a Discord `<t:unix:format>` token the way the Discord client does. */
function formatTimestamp(
	unix: number,
	format: string | undefined,
	locale: Locale
): string {
	const date = new Date(unix * 1000);
	const loc = localeTag(locale);
	switch (format) {
		case "t":
			return new Intl.DateTimeFormat(loc, { timeStyle: "short" }).format(date);
		case "T":
			return new Intl.DateTimeFormat(loc, { timeStyle: "medium" }).format(date);
		case "d":
			return new Intl.DateTimeFormat(loc, { dateStyle: "short" }).format(date);
		case "D":
			return new Intl.DateTimeFormat(loc, { dateStyle: "long" }).format(date);
		case "f":
			return new Intl.DateTimeFormat(loc, {
				dateStyle: "long",
				timeStyle: "short",
			}).format(date);
		case "R": {
			const diff = Math.round((date.getTime() - Date.now()) / 1000);
			const rtf = new Intl.RelativeTimeFormat(loc, { numeric: "auto" });
			const abs = Math.abs(diff);
			if (abs < 60) return rtf.format(diff, "second");
			if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
			if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
			return rtf.format(Math.round(diff / 86400), "day");
		}
		default:
			return new Intl.DateTimeFormat(loc, {
				dateStyle: "full",
				timeStyle: "short",
			}).format(date);
	}
}

function renderContent(content: string | MdNode[] | undefined, ctx: Ctx): ReactNode {
	if (content === undefined) return null;
	if (typeof content === "string") return content;
	// Drop `<br>` nodes that immediately precede a subtext block: the bot footer
	// uses "\n\n-# …", but the subtext already renders on its own line, so the
	// extra blank line would just be wasted vertical space.
	const nodes = content.filter((node, i) => {
		if (node.type !== "br") return true;
		let j = i + 1;
		while (j < content.length && content[j].type === "br") j++;
		return content[j]?.type !== "subtext";
	});
	return nodes.map((child, i) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: AST order is stable for a given input.
		<Fragment key={i}>{renderNode(child, ctx)}</Fragment>
	));
}

function mentionPill(label: string): ReactNode {
	return (
		<Box component="span" sx={mentionSx}>
			{label}
		</Box>
	);
}

const pillIconSx: SxProps<Theme> = { fontSize: "0.9em", verticalAlign: "-0.15em" };

/** Thread-mention pill: `# name › 💬`, mimicking how Discord renders a thread link. */
function threadPill(label: string): ReactNode {
	return (
		<Box component="span" sx={mentionSx}>
			<Tag sx={pillIconSx} />
			{label}
			<Box component="span" sx={{ mx: 0.3, opacity: 0.7 }}>
				›
			</Box>
			<ChatBubbleOutlined sx={pillIconSx} />
		</Box>
	);
}

function renderNode(node: MdNode, ctx: Ctx): ReactNode {
	const inner = () => renderContent(node.content, ctx);
	switch (node.type) {
		case "text":
			return typeof node.content === "string" ? node.content : inner();
		case "strong":
			return <strong>{inner()}</strong>;
		case "em":
			return <em>{inner()}</em>;
		case "underline":
			return <u>{inner()}</u>;
		case "strikethrough":
			return <s>{inner()}</s>;
		case "inlineCode":
			return (
				<Box component="code" sx={inlineCodeSx}>
					{inner()}
				</Box>
			);
		case "codeBlock":
			return (
				<Box component="pre" sx={codeBlockSx}>
					<code>{inner()}</code>
				</Box>
			);
		case "subtext":
			return (
				<Box
					component="span"
					sx={{ display: "block", fontSize: "0.75em", color: "text.secondary", mt: 0.5 }}
				>
					{inner()}
				</Box>
			);
		case "blockQuote":
			return <Box sx={quoteSx}>{inner()}</Box>;
		case "spoiler":
			return (
				<Box component="span" sx={spoilerSx}>
					{inner()}
				</Box>
			);
		case "br":
			return <br />;
		case "timestamp":
			return (
				<Box component="span" sx={timestampSx}>
					{formatTimestamp(Number(node.timestamp), node.format, ctx.locale)}
				</Box>
			);
		case "user":
			return mentionPill(`@${(node.id && ctx.mentions?.[node.id]) || "user"}`);
		case "channel": {
			const id = node.id ?? "";
			if (ctx.threads?.[id]) return threadPill(ctx.threads[id]);
			return mentionPill(`#${ctx.channels?.[id] ?? "channel"}`);
		}
		case "twemoji":
			// Unicode emoji (e.g. the `↪` reply arrow in the footer); render as-is.
			return node.name ?? null;
		case "role":
			return mentionPill("@role");
		case "everyone":
			return mentionPill("@everyone");
		case "here":
			return mentionPill("@here");
		case "url":
		case "link":
			return (
				<Link href={node.target} target="_blank" rel="noopener noreferrer">
					{inner()}
				</Link>
			);
		default:
			return inner();
	}
}

const rootSx: SxProps<Theme> = {
	whiteSpace: "pre-wrap",
	wordBreak: "break-word",
	lineHeight: 1.6,
};

export default function DiscordMarkdown({
	content,
	mentions,
	channels,
	threads,
}: {
	content: string;
	mentions?: Record<string, string>;
	channels?: Record<string, string>;
	threads?: Record<string, string>;
}) {
	const { locale } = useI18n();
	// "extended" mode adds the masked-link rule (`[text](url)`) on top of "normal".
	// The roll output is a bot/app message, where masked links render as clickable
	// links (e.g. the context/save-link footer) — exactly what we reproduce here.
	const ast = useMemo(() => parse(content, "extended") as MdNode[], [content]);
	return (
		<Box sx={rootSx}>{renderContent(ast, { locale, mentions, channels, threads })}</Box>
	);
}
