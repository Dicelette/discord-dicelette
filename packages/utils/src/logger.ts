/** biome-ignore-all lint/style/useNamingConvention: Logger us a specific non naming convention */
import process from "node:process";
import { formatWithOptions } from "node:util";
import * as Sentry from "@sentry/node";
import dotenv from "dotenv";
import stripAnsi from "strip-ansi";
import {
	type ILogObj,
	type IMeta,
	type ISettings,
	type ISettingsParam,
	Logger,
} from "tslog";
import pkgJson from "../../../package.json" with { type: "json" };
import { BotError, BotErrorLevel } from "./errors";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env", quiet: true });

// tslog log level ids: SILLY=0, TRACE=1, DEBUG=2, INFO=3, WARN=4, ERROR=5, FATAL=6
function writeToConsole(output: string, logLevelId: number) {
	if (logLevelId >= 5) {
		console.error(output); // ERROR, FATAL
	} else if (logLevelId === 4) {
		console.warn(output); // WARN
	} else if (logLevelId === 3) {
		console.info(output); // INFO
	} else {
		console.debug(output); // SILLY, TRACE, DEBUG
	}
}

/**
 * tslog's default pretty transport always writes through console.log, no matter
 * the log level. PM2 splits stdout -> out.log and stderr -> error.log, so WARN/
 * ERROR/FATAL logs never reached error.log. This dispatches to the console method
 * matching each level (console.debug/info/warn/error), which also keeps Sentry's
 * consoleLoggingIntegration below tagging breadcrumbs with the correct level.
 */
function transportFormatted(
	logMetaMarkup: string,
	logArgs: unknown[],
	logErrors: string[],
	logMeta?: IMeta,
	settings?: ISettings<ILogObj>
) {
	const prettyLogs = settings?.stylePrettyLogs !== false;
	const metaMarkup = prettyLogs ? logMetaMarkup : stripAnsi(logMetaMarkup);
	const logErrorsStr =
		(logErrors.length > 0 && logArgs.length > 0 ? "\n" : "") + logErrors.join("\n");
	if (settings?.prettyInspectOptions) settings.prettyInspectOptions.colors = prettyLogs;
	const formattedArgs = formatWithOptions(
		settings?.prettyInspectOptions ?? {},
		...logArgs
	);
	writeToConsole(metaMarkup + formattedArgs + logErrorsStr, logMeta?.logLevelId ?? 0);
}

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

const BASE_STYLE: ISettingsParam<ILogObj>["prettyLogStyles"] = {
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

const prodSettings: ISettingsParam<ILogObj> = {
	hideLogPositionForProduction: true,
	minLevel: 6,
	name: "LOGGER",
	overwrite: { transportFormatted },
	prettyErrorStackTemplate: BASE_STACK_TEMPLATE,
	prettyErrorTemplate: BASE_ERROR_TEMPLATE,
	prettyLogStyles: BASE_STYLE,
	prettyLogTemplate: PROD_TEMPLATE,
	prettyLogTimeZone: "local",
	stylePrettyLogs: true,
};

const devSettings: ISettingsParam<ILogObj> = {
	minLevel: 0, // everything
	overwrite: { transportFormatted },
	prettyErrorStackTemplate: BASE_STACK_TEMPLATE,
	prettyErrorTemplate: BASE_ERROR_TEMPLATE,
	prettyLogStyles: BASE_STYLE,
	prettyLogTemplate:
		"{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}} {{logLevelName}} [{{filePathWithLine}}{{name}}] ",
	prettyLogTimeZone: "local",
	stylePrettyLogs: true,
};

export const logger: Logger<ILogObj> = new Logger(
	process.env.NODE_ENV === "production" ? prodSettings : devSettings
);

const IMPORTANT_LOG_TEMPLATE = process.env.PROD
	? `${TIME_TEMPLATE}[{{logLevelName}}] `
	: "[{{logLevelName}}] ";

// Logger pour les trucs importants (notifications, etc)
export const important: Logger<ILogObj> = new Logger({
	hideLogPositionForProduction: true,
	minLevel: 1,
	name: "IMPORTANT",
	overwrite: { transportFormatted },
	prettyErrorStackTemplate: BASE_STACK_TEMPLATE,
	prettyErrorTemplate: BASE_ERROR_TEMPLATE,
	prettyLogStyles: {
		...BASE_STYLE,
		logLevelName: LOG_LEVEL_COLORS,
	},
	prettyLogTemplate: IMPORTANT_LOG_TEMPLATE,
	prettyLogTimeZone: "local",
	stylePrettyLogs: true,
});

const hasSentry = !!process.env.SENTRY_DSN && process.env.NODE_ENV === "production";

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
		enableLogs: true,
		environment: process.env.NODE_ENV ?? "production",
		integrations: [
			Sentry.consoleLoggingIntegration({
				levels: ["debug", "info", "warn", "error", "log", "assert", "trace"],
			}),
		],
		profileLifecycle: "manual",
		profileSessionSampleRate: 1.0,
		release: `dicelette@${pkgJson.version}`,
		sendDefaultPii: true,
		tracesSampleRate: 1.0,
	});
}

export async function sentryFlush(timeout = 2000): Promise<void> {
	if (hasSentry) await Sentry.flush(timeout);
}

export function setupProcessErrorHandlers() {
	process.on("unhandledRejection", (reason) => {
		logger.error("Unhandled rejection:", reason);
		if (hasSentry) Sentry.captureException(reason);
	});

	process.on("uncaughtException", (err) => {
		logger.fatal("Uncaught exception:", err);
		if (hasSentry) {
			Sentry.captureException(err);
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

export const sentry = {
	debug: (e: unknown, extra?: Record<string, unknown>) => {
		if (!hasSentry) return;
		if (e instanceof BotError && e.level && e.level < 2) return;
		Sentry.captureException(e, { extra, level: "debug" });
	},
	error: (e: unknown, extra?: Record<string, unknown>) => {
		if (!hasSentry) return;
		if (e instanceof BotError && e.level && e.level < 2) return;

		Sentry.captureException(e, { extra, level: "error" });
	},
	fatal: (e: unknown, extra?: Record<string, unknown>) => {
		if (!hasSentry) return;
		if (e instanceof BotError && e.level && e.level < 2) return;

		Sentry.captureException(e, { extra, level: "fatal" });
	},
	info: (e: unknown, extra: Record<string, unknown>) => {
		if (!hasSentry) return;
		if (e instanceof BotError && e.level && e.level < 2) return;

		Sentry.captureException(e, { extra, level: "info" });
	},
	warn: (e: unknown, extra?: Record<string, unknown>) => {
		if (!hasSentry) return;
		if (e instanceof BotError && e.level && e.level < 2) return;

		Sentry.captureException(e, { extra, level: "warning" });
	},
};

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
	console.error(e);
}
