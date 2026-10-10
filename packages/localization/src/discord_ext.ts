/** biome-ignore-all lint/suspicious/noExplicitAny: global override for discord_ext */
import { cmdLn, t } from "@dicelette/localization";
import * as Djs from "discord.js";

declare module "discord.js" {
	interface SlashCommandBuilder {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandSubcommandBuilder {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandSubcommandGroupBuilder {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandStringOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandBooleanOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandChannelOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandRoleOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandNumberOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandIntegerOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandMentionableOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandUserOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface SlashCommandAttachmentOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}

	interface CommandInteraction<Cached extends CacheType = CacheType> {
		botReply(
			options: string | MessagePayload | InteractionReplyOptions
		): Promise<Message | InteractionResponse>;
	}

	interface ModalSubmitInteraction<Cached extends CacheType = CacheType> {
		botReply(
			options: string | MessagePayload | InteractionReplyOptions
		): Promise<Message | InteractionResponse>;
	}

	interface MessageComponentInteraction<Cached extends CacheType = CacheType> {
		botReply(
			options: string | MessagePayload | InteractionReplyOptions
		): Promise<Message | InteractionResponse>;
	}
}

const SET_NAMES_IMPL = function (this: any, key: string) {
	return this.setName(t(key as any)).setNameLocalizations(cmdLn(key));
};

const SET_DESCRIPTIONS_IMPL = function (this: any, key: string) {
	return this.setDescription(t(key as any)).setDescriptionLocalizations(cmdLn(key));
};

/** Replies to the interaction, or edits/follows up when it was already replied to or deferred. */
const BOT_REPLY_IMPL = async function (
	this: any,
	options: string | Djs.MessagePayload | Djs.InteractionReplyOptions
): Promise<Djs.Message | Djs.InteractionResponse> {
	try {
		if (this.replied || this.deferred) {
			const editOptions =
				typeof options === "string" || options instanceof Djs.MessagePayload
					? options
					: ({ ...options } as Djs.InteractionEditReplyOptions);
			return await this.editReply(editOptions);
		}
		return await this.reply(options);
	} catch {
		if (!this.deferred && !this.replied) return await this.reply(options);

		return await this.followUp(options);
	}
};

/** Applies setNames/setDescriptions to multiple Discord.js builder prototypes. */
function applyLocalizationMethods(prototypes: (object | undefined)[]) {
	for (const prototype of prototypes) {
		if (prototype) {
			Object.defineProperty(prototype, "setNames", { value: SET_NAMES_IMPL });
			Object.defineProperty(prototype, "setDescriptions", {
				value: SET_DESCRIPTIONS_IMPL,
			});
		}
	}
}

applyLocalizationMethods([
	// Command builders
	Djs.SlashCommandBuilder.prototype,
	Djs.SlashCommandSubcommandBuilder.prototype,
	Djs.SlashCommandSubcommandGroupBuilder.prototype,
	// Option types
	Djs.SlashCommandStringOption.prototype,
	Djs.SlashCommandBooleanOption.prototype,
	Djs.SlashCommandChannelOption.prototype,
	Djs.SlashCommandRoleOption.prototype,
	Djs.SlashCommandNumberOption.prototype,
	Djs.SlashCommandIntegerOption.prototype,
	Djs.SlashCommandMentionableOption.prototype,
	Djs.SlashCommandUserOption.prototype,
	Djs.SlashCommandAttachmentOption.prototype,
]);

for (const prototype of [
	Djs.CommandInteraction.prototype,
	Djs.ModalSubmitInteraction.prototype,
	Djs.MessageComponentInteraction.prototype,
])
	Object.defineProperty(prototype, "botReply", { value: BOT_REPLY_IMPL });
