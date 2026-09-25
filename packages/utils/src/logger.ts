/** biome-ignore-all lint/style/useNamingConvention: Logger us a specific non naming convention */
import process from "node:process";
import * as Sentry from "@sentry/node";
import dotenv from "dotenv";
import stripAnsi from "strip-ansi";
import {
	type ILogObj,
	type IPrettyLogStyles,
	type ISettingsParam,
	Logger,
	type Transport,
} from "tslog";
import pkgJson from "../../../package.json" with { type: "json" };
import { BotError, BotErrorLevel } from "./errors";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env", quiet: true });

const hasSentry = !!process.env.SENTRY_DSN && process.env.NODE_ENV === "production";

// tslog's default pretty output always writes through console.log, no matter the log level. PM2
// splits stdout -> out.log and stderr -> error.log, so WARN/ERROR/FATAL never reached error.log.
// `pretty.levelMethod` routes each level to the matching console method instead, which also keeps
// Sentry's consoleLoggingIntegration below tagging breadcrumbs with the correct level.
const LEVEL_METHOD = {
	DEBUG: console.debug,
	ERROR: console.error,
	FATAL: console.error,
	INFO: console.info,
	SILLY: console.debug,
	TRACE: console.debug,
	WARN: console.warn,
};

const LOG_LEVEL_COLORS = {
	"*": ["bold", "black", "bgWhiteBright", "dim"],
	DEBUG: ["bold", "green"],
	ERROR: ["bold", "red"],
	FATAL: ["bold", "redBright"],
	INFO: ["bold", "blue"],
	SILLY: ["bold", "white"],
	TRACE: ["bold", "whiteBright"],
	WARN: ["bold", "yellow"],
};

const BASE_STYLE: IPrettyLogStyles = {
	dateIsoStr: ["dim"],
	errorName: ["bold", "bgRedBright", "whiteBright"],
	fileName: ["yellow"],
	filePathWithLine: ["dim"],
	logLevelName: LOG_LEVEL_COLORS,
	name: ["white", "bold"],
};

const BASE_ERROR_TEMPLATE = "\n{{errorName}} {{errorMessage}}\nStack:\n{{errorStack}}";
const BASE_STACK_TEMPLATE = "    at {{method}} ({{filePathWithLine}})";
const TEMPLATE = "{{logLevelName}} [{{filePathWithLine}}{{name}}] ";
const TIME_TEMPLATE = "{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}} ";
const PROD_TEMPLATE = process.env.PROD ? `${TIME_TEMPLATE}${TEMPLATE}` : TEMPLATE;

const SENTRY_ISSUE_LEVEL: Record<string, Sentry.SeverityLevel> = {
	ERROR: "error",
	FATAL: "fatal",
	WARN: "warning",
};

// Forwards WARN/ERROR/FATAL records to Sentry as issues, alongside the normal console output.
// The record still carries the native Error instance (record.nativeError, set by tslog before
// JSON-stringifying it into `line`), so Sentry gets the real exception with its stack/cause chain
// instead of a stringified copy; a message-only log falls back to captureMessage.
const sentryTransport: Transport<ILogObj> = {
	format: "json",
	minLevel: "WARN",
	write(record, line) {
		if (!hasSentry) return;
		const { _logMeta, ...fields } = JSON.parse(line);
		const nativeError = [record, ...Object.values(record)]
			.map((value) => (value as { nativeError?: unknown } | null)?.nativeError)
			.find((candidate): candidate is Error => candidate instanceof Error);
		if (
			nativeError instanceof BotError &&
			nativeError.level != null &&
			nativeError.level < 2
		)
			return;
		const level = SENTRY_ISSUE_LEVEL[_logMeta.logLevelName as string] ?? "error";
		if (nativeError) Sentry.captureException(nativeError, { extra: fields, level });
		else Sentry.captureMessage(String(fields.message ?? line), { extra: fields, level });
	},
};

const prodSettings: ISettingsParam<ILogObj> = {
	attachedTransports: [sentryTransport],
	minLevel: 6,
	name: "LOGGER",
	pretty: {
		errorStackTemplate: BASE_STACK_TEMPLATE,
		errorTemplate: BASE_ERROR_TEMPLATE,
		levelMethod: LEVEL_METHOD,
		style: true,
		styles: BASE_STYLE,
		template: PROD_TEMPLATE,
		timeZone: "local",
	},
	stack: { capture: "off" },
};

const devSettings: ISettingsParam<ILogObj> = {
	attachedTransports: [sentryTransport],
	minLevel: 0, // everything
	pretty: {
		errorStackTemplate: BASE_STACK_TEMPLATE,
		errorTemplate: BASE_ERROR_TEMPLATE,
		levelMethod: LEVEL_METHOD,
		style: true,
		styles: BASE_STYLE,
		template:
			"{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}} {{logLevelName}} [{{filePathWithLine}}{{name}}] ",
		timeZone: "local",
	},
};

export const logger: Logger<ILogObj> = new Logger(
	process.env.NODE_ENV === "production" ? prodSettings : devSettings
);

const IMPORTANT_LOG_TEMPLATE = process.env.PROD
	? `${TIME_TEMPLATE}[{{logLevelName}}] `
	: "[{{logLevelName}}] ";

// Logger pour les trucs importants (notifications, etc)
export const important: Logger<ILogObj> = new Logger({
	attachedTransports: [sentryTransport],
	minLevel: 1,
	name: "IMPORTANT",
	pretty: {
		errorStackTemplate: BASE_STACK_TEMPLATE,
		errorTemplate: BASE_ERROR_TEMPLATE,
		levelMethod: LEVEL_METHOD,
		style: true,
		styles: {
			...BASE_STYLE,
			logLevelName: LOG_LEVEL_COLORS,
		},
		template: IMPORTANT_LOG_TEMPLATE,
		timeZone: "local",
	},
	stack: { capture: "off" },
});

if (hasSentry) {
	important.info("Sentry is enabled for logging errors.");
	Sentry.init({
		beforeBreadcrumb(breadcrumb, _hint) {
			//remove ansi
			if (breadcrumb.message) {
				breadcrumb.message = stripAnsi(breadcrumb.message);
			}
			return breadcrumb;
		},
		dsn: process.env.SENTRY_DSN,
		environment: process.env.NODE_ENV ?? "production",
		integrations: [
			Sentry.consoleLoggingIntegration({
				levels: ["debug", "info", "warn", "error", "log", "assert", "trace"],
			}),
		],
		profileLifecycle: "manual",
		profileSessionSampleRate: 1.0,
		release: `dicelette@${pkgJson.version}`,
		tracesSampleRate: 1.0,
	});
}

export async function sentryFlush(timeout = 2000): Promise<void> {
	if (hasSentry) await Sentry.flush(timeout);
}

export function setupProcessErrorHandlers() {
	process.on("unhandledRejection", (reason) => {
		logger.error("Unhandled rejection:", reason);
	});

	process.on("uncaughtException", (err) => {
		logger.fatal("Uncaught exception:", err);
		if (hasSentry) {
			void Sentry.flush(2000).finally(() => process.exit(1));
		} else {
			process.exit(1);
		}
	});

	const shutdown = (signal: string) => {
		logger.warn(`${signal} received, shutting down...`);
		void sentryFlush(2000).finally(() => process.exit(0));
	};

	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));
}

export function consoleError(e: BotError | Error) {
	if (e instanceof BotError) {
		const { level } = e;
		if (!level) return;
		switch (level) {
			case BotErrorLevel.Warning:
				logger.warn(e);
				break;
			case BotErrorLevel.Error:
				important.error(e);
				break;
			case BotErrorLevel.Critical:
			case BotErrorLevel.Fatal:
				important.fatal(e);
				break;
		}
		return;
	}
	logger.error(e);
}
