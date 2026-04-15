import { resolveUserAttributes } from "@dicelette/helpers";
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
	const resolved = resolveUserAttributes(attributes);
	if (!resolved.ok) return getChara?.stats;
	return Object.assign({}, resolved.value ?? {}, getChara?.stats ?? {});
}
