import "@dicelette/discord_ext";
import * as Djs from "discord.js";
import i18next from "i18next";
import { describe, expect, it } from "vitest";
import {
	addGeneratedGroups,
	addGeneratedSubcommands,
} from "../src/commands/userSettings/options";

i18next.addResourceBundle(
	"en",
	"translation",
	{
		userSettings: { options: { flag: { description: "Toggle the flag", name: "flag" } } },
	},
	true
);

type Group = Djs.APIApplicationCommandSubcommandGroupOption;
type Sub = Djs.APIApplicationCommandSubcommandOption;

const groupsOf = (defs?: Parameters<typeof addGeneratedGroups>[1]) => {
	const builder = new Djs.SlashCommandBuilder().setName("test").setDescription("test");
	addGeneratedGroups(builder, defs);
	return (builder.toJSON().options ?? []) as Group[];
};

describe("addGeneratedGroups", () => {
	it("builds a default group with a typed subcommand per flagged option", () => {
		const [group] = groupsOf({
			flag: { kind: "boolean", slash: true },
			hidden: { kind: "string" },
		});
		expect(group.name).toBe("options");
		expect(group.options!.map((sub) => sub.name)).toEqual(["flag", "list"]);
		const flag = group.options![0] as Sub;
		expect(flag.options![0].type).toBe(Djs.ApplicationCommandOptionType.Boolean);
		expect(flag.options![0].required).toBe(false);
	});

	it("keeps the existing formula command and leaves the attributes group to its builder", () => {
		const groups = groupsOf();
		expect(groups.map((g) => g.name)).toEqual(["custom_formula"]);
		const subs = groups[0].options as Sub[];
		expect(subs.map((s) => s.name)).toEqual(["configure", "display"]);
		expect(subs[0].options![0]).toMatchObject({ name: "formula", required: false });
	});
});

describe("addGeneratedSubcommands", () => {
	it("adds replace_unknown to the handwritten attributes group", () => {
		const group = addGeneratedSubcommands(
			new Djs.SlashCommandSubcommandGroupBuilder()
				.setName("attributes")
				.setDescription("a"),
			"userSettings.attributes.title"
		);
		const [sub] = group.toJSON().options as Sub[];
		expect(sub.name).toBe("replace_unknown");
		expect(sub.options![0].type).toBe(Djs.ApplicationCommandOptionType.String);
	});
});
