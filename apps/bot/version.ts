import packageJson from "../../package.json" with { type: "json" };

export const VERSION = packageJson.version ?? "/";
export const PRIVATE_ID = (process.env.PRIVATE_ID ?? "453162143668371456")
	.split(",")
	.map((id) => id.trim());
