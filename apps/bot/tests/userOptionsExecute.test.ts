import Enmap from "enmap";
import i18next from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replies: { content: string }[] = [];

vi.mock("messages", () => ({
	reply: async (_i: unknown, options: { content: string }) => {
		replies.push(options);
	},
}));
vi.mock("@dicelette/helpers", () => ({
	getInteractionContext: () => ({ ul: i18next.getFixedT("fr") }),
}));

const { userOptionsExecute } = await import(
	"../src/commands/userSettings/optionsExecute"
);

function fakeInteraction(subcommand: string, value: string | null) {
	return {
		guild: { id: "guild" },
		options: {
			getBoolean: () => null,
			getString: (name: string) => (name === "value" ? value : null),
			getSubcommand: () => subcommand,
			getSubcommandGroup: () => "prefix_edit_comment",
		},
		user: { id: "user" },
	};
}

describe("userOptionsExecute with a French user", () => {
	let client: { userSettings: Enmap };

	beforeEach(() => {
		replies.length = 0;
		client = { userSettings: new Enmap({ inMemory: true }) };
	});

	const run = (subcommand: string, value: string | null) =>
		userOptionsExecute(client as never, fakeInteraction(subcommand, value) as never);

	it("matches the default subcommand name sent by Discord and resets without value", async () => {
		expect(await run("configure", null)).toBe(true);
		expect(replies).toHaveLength(1);
		expect(replies[0].content).not.toContain("userSettings.");
	});

	it("reads the value through its default option name", async () => {
		expect(await run("configure", "~")).toBe(true);
		expect(client.userSettings.get("guild", "user.prefixEditComment")).toBe("~");
	});

	it("displays the stored value", async () => {
		await run("configure", "~");
		replies.length = 0;
		expect(await run("display", null)).toBe(true);
		expect(replies[0].content).toContain("~");
	});
});
