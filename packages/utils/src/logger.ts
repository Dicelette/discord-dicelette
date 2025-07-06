/** biome-ignore-all lint/style/useNamingConvention: Logger us a specific non naming convention */
import process from "node:process";
import dotenv from "dotenv";
import { type ILogObj, type ISettingsParam, Logger } from "tslog";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });

const LOG_LEVEL_COLORS = {
	"*": ["bold", "black", "bgWhiteBright", "dim"],
	SILLY: ["bold", "white"],
	TRACE: ["bold", "whiteBright"],
	DEBUG: ["bold", "green"],
	INFO: ["bold", "blue"],
	WARN: ["bold", "yellow"],
	ERROR: ["bold", "red"],
	FATAL: ["bold", "redBright"],
};

const BASE_STYLE: ISettingsParam<ILogObj>["prettyLogStyles"] = {
	logLevelName: LOG_LEVEL_COLORS,
	dateIsoStr: ["dim"],
	filePathWithLine: ["dim"],
	name: ["white", "bold"],
	errorName: ["bold", "bgRedBright", "whiteBright"],
	fileName: ["yellow"],
};

const BASE_ERROR_TEMPLATE = "\n{{errorName}} {{errorMessage}}\nStack:\n{{errorStack}}";
const BASE_STACK_TEMPLATE = "    at {{method}} ({{filePathWithLine}})";
const TEMPLATE = "{{logLevelName}} [{{filePathWithLine}}{{name}}] ";
const TIME_TEMPLATE = "{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}} ";
const PROD_TEMPLATE = process.env.PROD ? `${TIME_TEMPLATE}${TEMPLATE}` : TEMPLATE;

const prodSettings: ISettingsParam<ILogObj> = {
	name: "LOGGER",
	minLevel: 4,
	stylePrettyLogs: true,
	prettyLogTemplate: PROD_TEMPLATE,
	prettyErrorTemplate: BASE_ERROR_TEMPLATE,
	prettyErrorStackTemplate: BASE_STACK_TEMPLATE,
	prettyLogStyles: BASE_STYLE,
	hideLogPositionForProduction: true,
	prettyLogTimeZone: "local",
};

const devSettings: ISettingsParam<ILogObj> = {
	minLevel: 0, // everything
	stylePrettyLogs: true,
	prettyLogTemplate:
		"{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}} {{logLevelName}} [{{filePathWithLine}}{{name}}] ",
	prettyErrorTemplate: BASE_ERROR_TEMPLATE,
	prettyErrorStackTemplate: BASE_STACK_TEMPLATE,
	prettyLogStyles: BASE_STYLE,
	prettyLogTimeZone: "local",
};

export const logger: Logger<ILogObj> = new Logger(
	process.env.NODE_ENV === "production" ? prodSettings : devSettings
);

const IMPORTANT_LOG_TEMPLATE = process.env.PROD
	? `${TIME_TEMPLATE}[{{logLevelName}}] `
	: "[{{logLevelName}}] ";

// Logger pour les trucs importants (notifications, etc)
export const important: Logger<ILogObj> = new Logger({
	name: "IMPORTANT",
	minLevel: 0,
	stylePrettyLogs: true,
	prettyLogTemplate: IMPORTANT_LOG_TEMPLATE,
	prettyErrorTemplate: BASE_ERROR_TEMPLATE,
	prettyErrorStackTemplate: BASE_STACK_TEMPLATE,
	prettyLogStyles: {
		...BASE_STYLE,
		logLevelName: LOG_LEVEL_COLORS,
	},
	hideLogPositionForProduction: true,
	prettyLogTimeZone: "local",
});
