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
}

const SET_NAMES_IMPL = function (this: any, key: string) {
	return this.setName(t(key as any)).setNameLocalizations(cmdLn(key));
};

const SET_DESCRIPTIONS_IMPL = function (this: any, key: string) {
	return this.setDescription(t(key as any)).setDescriptionLocalizations(cmdLn(key));
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
