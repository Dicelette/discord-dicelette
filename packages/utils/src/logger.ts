/** biome-ignore-all lint/style/useNamingConvention: Logger us a specific non naming convention */
import process from "node:process";
import dotenv from "dotenv";
import { type ILogObj, type ISettingsParam, Logger } from "tslog";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });

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
