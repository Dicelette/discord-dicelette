/** biome-ignore-all lint/style/useNamingConvention: Logger us a specific non naming convention */
import process from "node:process";
import dotenv from "dotenv";
import { type ILogObj, type ISettingsParam, Logger } from "tslog";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });

const BASE_STYLE: ISettingsParam<ILogObj>["prettyLogStyles"] = {
	logLevelName: {
		"*": ["bold", "black", "bgWhiteBright", "dim"],
		SILLY: ["bold", "white"],
		TRACE: ["bold", "whiteBright"],
		DEBUG: ["bold", "green"],
		INFO: ["bold", "blue"],
		WARN: ["bold", "yellow"],
		ERROR: ["bold", "red"],
		FATAL: ["bold", "redBright"],
	},
	dateIsoStr: ["dim"],
	filePathWithLine: ["dim"],
	name: ["white", "bold"],
	errorName: ["bold", "bgRedBright", "whiteBright"],
	fileName: ["yellow"],
};

const BASE_ERROR_TEMPLATE = "\n{{errorName}} {{errorMessage}}\nStack:\n{{errorStack}}";
const BASE_STACK_TEMPLATE = "    at {{method}} ({{filePathWithLine}})";

const prodSettings: ISettingsParam<ILogObj> = {
	minLevel: 5, // error+
	stylePrettyLogs: true,
	prettyLogTemplate: "{{logLevelName}} [{{filePathWithLine}}{{name}}] ",
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

// Logger pour les trucs importants (notifications, etc)
export const important: Logger<ILogObj> = new Logger({
	name: "Note",
	minLevel: 0,
	stylePrettyLogs: true,
	prettyLogTemplate: "[{{logLevelName}}] ",
	prettyErrorTemplate: BASE_ERROR_TEMPLATE,
	prettyErrorStackTemplate: BASE_STACK_TEMPLATE,
	prettyLogStyles: {
		...BASE_STYLE,
		logLevelName: {
			"*": ["bold", "white", "bgBlue"],
			INFO: ["bold", "whiteBright", "bgGreenBright"],
			WARN: ["bold", "black", "bgYellow"],
			ERROR: ["bold", "white", "bgRed"],
		},
	},
	hideLogPositionForProduction: true,
	prettyLogTimeZone: "local",
});
