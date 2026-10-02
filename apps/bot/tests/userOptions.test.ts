import "@dicelette/discord_ext";
import { resources } from "@dicelette/localization";
import { USER_OPTIONS } from "@dicelette/types";
import * as Djs from "discord.js";
import i18next from "i18next";
import { describe, expect, it } from "vitest";
import {
	addGeneratedGroups,
	addGeneratedSubcommands,
	missingSlashKeys,
	slashEntries,
} from "../src/commands/userSettings/options";

i18next.addResourceBundle(
	"en",
	"translation",
	{
		userSettings: {
			options: {
				flag: { description: "Toggle the flag", group: "flag", value: "New state" },
			},
		},
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
	it("builds a group per option like custom_formula, typed by kind", () => {
		const groups = groupsOf({
			flag: { kind: "boolean", slash: true },
			hidden: { kind: "string" },
		});
		expect(groups.map((g) => g.name)).toEqual(["flag"]);
		const subs = groups[0].options as Sub[];
		expect(subs.map((sub) => sub.name)).toEqual(["configure", "display"]);
		expect(subs[0].options![0]).toMatchObject({
			name: "value",
			required: false,
			type: Djs.ApplicationCommandOptionType.Boolean,
		});
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

describe("slash translations", () => {
	it("has every key of every slash option in every locale", () => {
		const languages = Object.keys(resources);
		const missing = slashEntries(USER_OPTIONS).flatMap(({ key, spec }) =>
			missingSlashKeys(spec, languages).map((m) => `${key} -> ${m}`)
		);
		expect(missing).toEqual([]);
	});

	it("uses Discord-valid names in every locale", () => {
		const invalid = slashEntries(USER_OPTIONS).flatMap(({ key, spec }) =>
			Object.keys(resources).flatMap((lng) =>
				[spec.group, spec.subcommand, spec.valueName, spec.display?.subcommand]
					.filter((k): k is string => !!k)
					.map((k) => ({ key, lng, name: i18next.t(k, { lng }) as string }))
					.filter(({ name }) => !/^[\p{Ll}\p{N}_-]{1,32}$/u.test(name))
			)
		);
		expect(invalid).toEqual([]);
	});

	it("names the missing keys instead of failing in the Discord builder", () => {
		expect(() => groupsOf({ unknown: { kind: "string", slash: true } })).toThrow(
			/"unknown" is missing translations[\s\S]*userSettings\.options\.unknown\.group/
		);
	});
});
