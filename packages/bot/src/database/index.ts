import type { UserData } from "@dicelette/types";
import type { EClient } from "client";

export * from "./delete_user";
export * from "./get_template";
export * from "./get_user";
export * from "./memory";
export * from "./register_user";

export function mergeAttribute(
	client: EClient,
	getChara: UserData | undefined,
	guildId: string,
	userId: string
) {
	const attributes = client.userSettings.get(guildId, userId)?.attributes;
	if (attributes) return Object.assign({}, attributes, getChara?.stats ?? {});
	return getChara?.stats;
}
