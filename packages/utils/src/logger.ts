/** biome-ignore-all lint/style/useNamingConvention: Logger us a specific non naming convention */
import process from "node:process";
import dotenv from "dotenv";
import { type ILogObj, type ISettingsParam, Logger } from "tslog";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });

const optionLoggers: ISettingsParam<ILogObj> =
	process.env.NODE_ENV === "development"
		? {
				minLevel: 0,
			}
		: {
				minLevel: 4,
				hideLogPositionForProduction: true,
			};

const defaultOptions = {
	prettyLogTemplate:
		"{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}} {{logLevelName}} [{{filePathWithLine}}] ",
	prettyErrorTemplate: "\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}",
	prettyErrorStackTemplate: "  • {{fileName}}\t{{method}}\n\t{{filePathWithLine}}",
	prettyErrorParentNamesSeparator: ":",
	prettyErrorLoggerNameDelimiter: "\t",
	stylePrettyLogs: true,
	prettyLogTimeZone: "Europe/Paris",
	prettyLogStyles: {
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
		dateIsoStr: "white",
		filePathWithLine: ["bold", "yellow"],
		name: ["white"],
		nameWithDelimiterPrefix: ["white", "bold"],
		nameWithDelimiterSuffix: ["white", "bold"],
		errorName: ["bold", "bgRedBright", "whiteBright"],
		fileName: ["white"],
		fileNameWithLine: "white",
	},
};

export const logger: Logger<ILogObj> = new Logger(
	Object.assign(defaultOptions, optionLoggers)
);
export const important: Logger<ILogObj> = new Logger({
	name: "Note",
	minLevel: 0,
	hideLogPositionForProduction: true,
	prettyLogTemplate:
		"{{dd}}/{{mm}}/{{yyyy}} {{hh}}:{{MM}}:{{ss}}.{{ms}} [{{logLevelName}}]",
	prettyLogStyles: {
		dd: "dim",
		mm: "dim",
		yyyy: "dim",
		hh: "dim",
		MM: "dim",
		ss: "dim",
		ms: "dim",
		logLevelName: {
			"*": ["bold", "black", "bgWhiteBright", "dim"],
			SILLY: ["bold", "white"],
			TRACE: ["bold", "whiteBright"],
			DEBUG: ["bold", "green"],
			INFO: ["bold", "whiteBright", "bgGreenBright"],
			WARN: ["bold", "yellow"],
			ERROR: ["bold", "red"],
			FATAL: ["bold", "redBright"],
		},
	},
});
