import * as Djs from "discord.js";
import { cmdLn, t } from "@dicelette/localization";

// Déclarations TypeScript
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
}

// Implémentations avec typage explicite
const setNamesImpl = function (this: any, key: string) {
	return this.setName(t(key)).setNameLocalizations(cmdLn(key));
};

const setDescriptionsImpl = function (this: any, key: string) {
	return this.setDescription(t(key)).setDescriptionLocalizations(cmdLn(key));
};

// Extension des prototypes
Object.defineProperty(Djs.SlashCommandBuilder.prototype, "setNames", {
	value: setNamesImpl,
});

Object.defineProperty(Djs.SlashCommandBuilder.prototype, "setDescriptions", {
	value: setDescriptionsImpl,
});

Object.defineProperty(Djs.SlashCommandSubcommandBuilder.prototype, "setNames", {
	value: setNamesImpl,
});

Object.defineProperty(Djs.SlashCommandSubcommandBuilder.prototype, "setDescriptions", {
	value: setDescriptionsImpl,
});

// Ajout du support pour les groupes de sous-commandes
Object.defineProperty(Djs.SlashCommandSubcommandGroupBuilder.prototype, "setNames", {
	value: setNamesImpl,
});

Object.defineProperty(
	Djs.SlashCommandSubcommandGroupBuilder.prototype,
	"setDescriptions",
	{
		value: setDescriptionsImpl,
	}
);

// Extension des options avec accès sécurisé
const optionTypes = [
	{ name: "String", class: Djs.SlashCommandStringOption },
	{ name: "Boolean", class: Djs.SlashCommandBooleanOption },
	{ name: "Channel", class: Djs.SlashCommandChannelOption },
	{ name: "Role", class: Djs.SlashCommandRoleOption },
	{ name: "Number", class: Djs.SlashCommandNumberOption },
];

optionTypes.forEach(({ class: optionClass }) => {
	if (optionClass?.prototype) {
		Object.defineProperty(optionClass.prototype, "setNames", { value: setNamesImpl });
		Object.defineProperty(optionClass.prototype, "setDescriptions", {
			value: setDescriptionsImpl,
		});
	}
});
