import process from "node:process";
import { DiscordAPIError } from "@discordjs/rest";
import type { EClient } from "client";
import dedent from "dedent";
import dotenv from "dotenv";

dotenv.config({ path: process.env.PROD ? ".env.prod" : ".env" });

function formatErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return dedent(`## ❌ Erreur détectée
				**Message**: \`${error.message}\`
				
				**Stack trace**:
				\`\`\`
				${error.stack}
				\`\`\`
        `);
	}
	return dedent(`## ❌ Erreur inconnue
			\`\`\`
			${String(error)}
			\`\`\`
  `);
}

export default (client: EClient): void => {
	client.on("error", async (error) => {
		const ignoreCode = [50001, 50013];
		if (error instanceof DiscordAPIError && ignoreCode.includes(<number>error.code))
			return;

		console.warn("\n", error);
		if (!process.env.OWNER_ID) return;
		const dm = await client.users.createDM(process.env.OWNER_ID);
		await dm.send({ content: formatErrorMessage(error) });
	});
};
