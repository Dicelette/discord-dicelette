import { reuploadAvatar } from "@dicelette/helpers";
import type { Translation } from "@dicelette/types";
import { QUERY_URL_PATTERNS } from "@dicelette/utils";
import type { AttachmentBuilder } from "discord.js";

type ResolveCsvImportAvatarParams = {
	avatar?: string | null;
	fallbackAvatarUrl: string | null;
	reuploadDiscordCdn?: boolean;
	ul?: Translation;
};

export async function resolveCsvImportAvatar({
	avatar,
	fallbackAvatarUrl,
	reuploadDiscordCdn = false,
	ul,
}: ResolveCsvImportAvatarParams): Promise<{
	avatarUrl: string | null;
	files: AttachmentBuilder[];
}> {
	if (!avatar)
		return {
			avatarUrl: fallbackAvatarUrl,
			files: [],
		};

	if (!avatar.match(QUERY_URL_PATTERNS.DISCORD_CDN))
		return {
			avatarUrl: avatar,
			files: [],
		};

	if (!reuploadDiscordCdn)
		return {
			avatarUrl: fallbackAvatarUrl,
			files: [],
		};

	if (!ul) throw new Error("Missing translator for Discord CDN avatar reupload");

	const res = await reuploadAvatar(
		{
			name: avatar.split("?")[0].split("/").pop() ?? "avatar.png",
			url: avatar,
		},
		ul
	);

	return {
		avatarUrl: res.name,
		files: [res.newAttachment],
	};
}
