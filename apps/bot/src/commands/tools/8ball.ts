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
		),
	async execute(interaction: Djs.ChatInputCommandInteraction, client: EClient) {
		const { ul } = getLangAndConfig(client, interaction);
		const question = interaction.options.getString(t("8ball.question.name"), false);
		const replies = [
			ul("8ball.reply.affirmative.ItIsCertain"),
			ul("8ball.reply.affirmative.ItIsDecidedlySo"),
			ul("8ball.reply.affirmative.WithoutADoubt"),
			ul("8ball.reply.affirmative.YesDefinitely"),
			ul("8ball.reply.affirmative.YouMayRelyOnIt"),
			ul("8ball.reply.Noncommittal.AsISeeItYes"),
			ul("8ball.reply.Noncommittal.MostLikely"),
			ul("8ball.reply.Noncommittal.OutlookGood"),
			ul("8ball.reply.Noncommittal.Yes"),
			ul("8ball.reply.Noncommittal.SignsPointToYes"),
			ul("8ball.reply.Negative.ReplyHazyTryAgain"),
			ul("8ball.reply.Negative.AskAgainLater"),
			ul("8ball.reply.Negative.BetterNotTellYouNow"),
			ul("8ball.reply.Negative.CannotPredictNow"),
			ul("8ball.reply.Negative.ConcentrateAndAskAgain"),
			ul("8ball.reply.VeryNegative.DontCountOnIt"),
			ul("8ball.reply.VeryNegative.MyReplyIsNo"),
			ul("8ball.reply.VeryNegative.MySourcesSayNo"),
			ul("8ball.reply.VeryNegative.OutlookNotSoGood"),
			ul("8ball.reply.VeryNegative.VeryDoubtful"),
		];
		const items = random.pick(replies);
		const res = ul("choose.result", {
			items,
		});
		const content = question ? `*${question}*\n${res}` : res;
		await interaction.reply({ content });
	},
};
