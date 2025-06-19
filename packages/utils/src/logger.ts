/** biome-ignore-all lint/style/useNamingConvention: Logger us a specific non naming convention */
import process from "node:process";
import dotenv from "dotenv";
import { type ILogObj, type ISettingsParam, Logger } from "tslog";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });
const overwrite = {
	transportFormatted: (
		logMetaMarkup: string,
		logArgs: unknown[],
		logErrors: string[]
	) => {
		const logLevel = logMetaMarkup.trim().split("\t")[1];
		switch (logLevel) {
			case "WARN":
				console.warn(logMetaMarkup, ...logArgs, ...logErrors);
				break;
			case "ERROR":
			case "FATAL":
				console.error(logMetaMarkup, ...logArgs, ...logErrors);
				break;
			case "INFO":
				console.info(logMetaMarkup, ...logArgs, ...logErrors);
				break;
			case "DEBUG":
			case "TRACE":
			case "SILLY":
				console.debug(logMetaMarkup, ...logArgs, ...logErrors);
				break;
			default:
				console.log(logMetaMarkup, ...logArgs, ...logErrors);
				break;
		}
	},
};

const optionLoggers: ISettingsParam<ILogObj> =
	process.env.NODE_ENV === "development"
		? {
				minLevel: 0,
				stylePrettyLogs: true,
			}
		: {
				minLevel: 4,
				hideLogPositionForProduction: true,
				overwrite,
				stylePrettyLogs: false,
			};

const defaultOptions: ISettingsParam<ILogObj> = {
	stylePrettyLogs: true,
	prettyLogTimeZone: "local",
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
		dateIsoStr: ["bgWhiteBright", "black", "dim"],
		filePathWithLine: ["bold", "yellow"],
		name: ["white"],
		nameWithDelimiterPrefix: ["white", "bold"],
		nameWithDelimiterSuffix: ["white", "bold"],
		errorName: ["bold", "bgRedBright", "whiteBright"],
		fileName: ["bold", "bgWhiteBright", "black"],
		fileLine: ["dim", "bgWhiteBright", "black"],
	},
};

export const logger: Logger<ILogObj> = new Logger(
	Object.assign(defaultOptions, optionLoggers)
);
export const important: Logger<ILogObj> = new Logger({
	name: "Note",
	minLevel: 0,
	overwrite,
	hideLogPositionForProduction: true,
	prettyLogTemplate: "[{{logLevelName}}] ",
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
