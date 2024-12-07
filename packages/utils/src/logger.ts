import process from "node:process";
import dotenv from "dotenv";
import { type ILogObj, Logger } from "tslog";
dotenv.config({ path: ".env" });

const optionLoggers =
	process.env.NODE_ENV === "development"
		? { minLevel: 0 }
		: { minLevel: 4, hideLogPositionForProduction: true };
export const logger: Logger<ILogObj> = new Logger(optionLoggers);
