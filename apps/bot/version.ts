import packageJson from "../../package.json" with { type: "json" };

//@ts-expect-error
export const VERSION = packageJson.version ?? "/";
export const PRIVATE_ID = (process.env.PRIVATE_ID ?? "453162143668371456")
	.split(",")
	.map((id) => id.trim());
