import "@dicelette/discord_ext";
import * as Djs from "discord.js";
import i18next from "i18next";
import { describe, expect, it } from "vitest";
import { userOptionsGroup } from "../src/commands/userSettings/options";

i18next.addResourceBundle(
	"en",
	"translation",
	{
		userSettings: { options: { flag: { description: "Toggle the flag", name: "flag" } } },
	},
	true
);

const buildGroup = (defs: Parameters<typeof userOptionsGroup>[0]) =>
	new Djs.SlashCommandBuilder()
		.setName("test")
		.setDescription("test")
		.addSubcommandGroup(userOptionsGroup(defs))
		.toJSON().options![0] as Djs.APIApplicationCommandSubcommandGroupOption;

describe("userOptionsGroup", () => {
	it("generates a typed subcommand per flagged option", () => {
		const group = buildGroup({
			flag: { kind: "boolean", slash: true },
			hidden: { kind: "string" },
		});
		const names = group.options!.map((sub) => sub.name);
		expect(names).toEqual(["flag", "list"]);
		const flag = group.options![0] as Djs.APIApplicationCommandSubcommandOption;
		expect(flag.options![0].type).toBe(Djs.ApplicationCommandOptionType.Boolean);
		expect(flag.options![0].required).toBe(false);
	});
});
