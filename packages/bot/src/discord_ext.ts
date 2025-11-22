//biome-ignore-all lint/suspicious/noExplicitAny: Allow explicit any for this extension file because it's simpler.

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

	interface SlashCommandAttachmentOption {
		setNames(key: string): this;
		setDescriptions(key: string): this;
	}
}

const SET_NAMES_IMPL = function (this: any, key: string) {
	return this.setName(t(key)).setNameLocalizations(cmdLn(key));
};

const SET_DESCRIPTIONS_IMPL = function (this: any, key: string) {
	return this.setDescription(t(key)).setDescriptionLocalizations(cmdLn(key));
};

Object.defineProperty(Djs.SlashCommandBuilder.prototype, "setNames", {
	value: SET_NAMES_IMPL,
});

Object.defineProperty(Djs.SlashCommandBuilder.prototype, "setDescriptions", {
	value: SET_DESCRIPTIONS_IMPL,
});

Object.defineProperty(Djs.SlashCommandSubcommandBuilder.prototype, "setNames", {
	value: SET_NAMES_IMPL,
});

Object.defineProperty(Djs.SlashCommandSubcommandBuilder.prototype, "setDescriptions", {
	value: SET_DESCRIPTIONS_IMPL,
});

Object.defineProperty(Djs.SlashCommandSubcommandGroupBuilder.prototype, "setNames", {
	value: SET_NAMES_IMPL,
});

Object.defineProperty(
	Djs.SlashCommandSubcommandGroupBuilder.prototype,
	"setDescriptions",
	{
		value: SET_DESCRIPTIONS_IMPL,
	}
);

const OPTION_TYPES = [
	{ class: Djs.SlashCommandStringOption, name: "String" },
	{ class: Djs.SlashCommandBooleanOption, name: "Boolean" },
	{ class: Djs.SlashCommandChannelOption, name: "Channel" },
	{ class: Djs.SlashCommandRoleOption, name: "Role" },
	{ class: Djs.SlashCommandNumberOption, name: "Number" },
	{ class: Djs.SlashCommandMentionableOption, name: "Mentionable" },
	{ class: Djs.SlashCommandUserOption, name: "User" },
	{ class: Djs.SlashCommandAttachmentOption, name: "Attachment" },
	{ class: Djs.SlashCommandIntegerOption, name: "Integer" },
];

OPTION_TYPES.forEach(({ class: optionClass }) => {
	if (optionClass?.prototype) {
		Object.defineProperty(optionClass.prototype, "setNames", { value: SET_NAMES_IMPL });
		Object.defineProperty(optionClass.prototype, "setDescriptions", {
			value: SET_DESCRIPTIONS_IMPL,
		});
	}
});
