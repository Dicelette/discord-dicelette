import type { EClient } from "../client";
import { sendMessageError } from "./on_error";
export default (client: EClient): void => {
	client.on("warn", async (error) => {
		await sendMessageError(error, client);
	});
};
