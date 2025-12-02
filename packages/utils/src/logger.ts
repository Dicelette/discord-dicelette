/** biome-ignore-all lint/style/useNamingConvention: Logger us a specific non naming convention */
import process from "node:process";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import dotenv from "dotenv";
import stripAnsi from "strip-ansi";
import { type ILogObj, type ISettingsParam, Logger } from "tslog";
import { BotError } from "./errors";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env", quiet: true });

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
	prettyErrorStackTemplate: BASE_STACK_TEMPLATE,
	prettyErrorTemplate: BASE_ERROR_TEMPLATE,
	prettyLogStyles: BASE_STYLE,
	prettyLogTemplate: PROD_TEMPLATE,
	prettyLogTimeZone: "local",
	stylePrettyLogs: true,
};

const devSettings: ISettingsParam<ILogObj> = {
	minLevel: 0, // everything
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
		environment: process.env.NODE_ENV ?? "production",
		integrations: [nodeProfilingIntegration()],
		profileLifecycle: "manual",
		profileSessionSampleRate: 1.0,
		release: process.env.BOT_VERSION, // optionnel,
		sendDefaultPii: true,
		tracesSampleRate: 1.0,
	});
}

export function setupProcessErrorHandlers() {
	if (!hasSentry) return;

	process.on("unhandledRejection", (reason) => {
		Sentry.captureException(reason);
	});

	process.on("uncaughtException", (err) => {
		Sentry.captureException(err);
		void Sentry.flush(2000).then(() => {
			process.exit(1);
		});
	});
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

export const profiler = Sentry.profiler;
