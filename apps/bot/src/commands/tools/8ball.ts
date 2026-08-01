import type { EClient } from "@dicelette/client";
import { getInteractionContext as getLangAndConfig } from "@dicelette/helpers";
import { t } from "@dicelette/localization";
import { random } from "@dicelette/utils";
import * as Djs from "discord.js";

export const balls = {
	data: new Djs.SlashCommandBuilder()
		.setNames("8ball.name")
		.setIntegrationTypes(
			Djs.ApplicationIntegrationType.GuildInstall,
			Djs.ApplicationIntegrationType.UserInstall
		)
		.setContexts(
			Djs.InteractionContextType.Guild,
			Djs.InteractionContextType.BotDM,
			Djs.InteractionContextType.PrivateChannel
		)
		.setDescriptions("8ball.description")
		.addStringOption((option) =>
			option
				.setNames("8ball.question.name")
				.setDescriptions("8ball.question.description")
				.setRequired(false)
		)
		.addBooleanOption((option) =>
			option
				.setNames("8ball.include_elusive.name")
				.setDescriptions("8ball.include_elusive.description")
				.setRequired(false)
		),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const { ul } = getLangAndConfig(client, interaction);
		const question = interaction.options.getString(t("8ball.question.name"), false);
		const includeElusive = interaction.options.getBoolean(
			t("8ball.include_elusive.name"),
			false
		);
		const replies: { reply: string; type: "affirmative" | "elusive" | "negative" }[] = [
			{ reply: ul("8ball.reply.affirmative.ItIsCertain"), type: "affirmative" },
			{ reply: ul("8ball.reply.affirmative.ItIsDecidedlySo"), type: "affirmative" },
			{ reply: ul("8ball.reply.affirmative.WithoutADoubt"), type: "affirmative" },
			{ reply: ul("8ball.reply.affirmative.YesDefinitely"), type: "affirmative" },
			{ reply: ul("8ball.reply.affirmative.YouMayRelyOnIt"), type: "affirmative" },
			{ reply: ul("8ball.reply.Noncommittal.AsISeeItYes"), type: "affirmative" },
			{ reply: ul("8ball.reply.Noncommittal.MostLikely"), type: "affirmative" },
			{ reply: ul("8ball.reply.Noncommittal.OutlookGood"), type: "affirmative" },
			{ reply: ul("8ball.reply.Noncommittal.Yes"), type: "affirmative" },
			{ reply: ul("8ball.reply.Noncommittal.SignsPointToYes"), type: "affirmative" },
			{ reply: ul("8ball.reply.Negative.ReplyHazyTryAgain"), type: "elusive" },
			{ reply: ul("8ball.reply.Negative.AskAgainLater"), type: "elusive" },
			{ reply: ul("8ball.reply.Negative.BetterNotTellYouNow"), type: "elusive" },
			{ reply: ul("8ball.reply.Negative.CannotPredictNow"), type: "elusive" },
			{ reply: ul("8ball.reply.Negative.ConcentrateAndAskAgain"), type: "elusive" },
			{ reply: ul("8ball.reply.VeryNegative.DontCountOnIt"), type: "negative" },
			{ reply: ul("8ball.reply.VeryNegative.MyReplyIsNo"), type: "negative" },
			{ reply: ul("8ball.reply.VeryNegative.MySourcesSayNo"), type: "negative" },
			{ reply: ul("8ball.reply.VeryNegative.OutlookNotSoGood"), type: "negative" },
			{ reply: ul("8ball.reply.VeryNegative.VeryDoubtful"), type: "negative" },
		];
		const reply: string[] = (
			includeElusive ? replies : replies.filter((r) => r.type !== "elusive")
		).map((r) => r.reply);

		const items = random.pick(reply);
		const res = ul("choose.result", {
			items,
		});
		const content = question ? `*${question}*\n  ${res}` : res;
		await interaction.reply({ content });
	},
};
