import { logger } from "@dicelette/utils";
import type { EClient } from "client";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export default (client: EClient): void => {
	client.on("error", async (error) => {
		logger.fatal(error);
		if (!process.env.OWNER_ID) return;
		const dm = await client.users.createDM(process.env.OWNER_ID);
		await dm.send(`An error has occurred:\n\`\`\`\n${error.message}\n\`\`\``);
	});
};
