import path from "node:path";
import type { EClient } from "client";
import * as Djs from "discord.js";

export default {
	data: new Djs.SlashCommandBuilder()
		.setName("test")
		.setDescription("test")
		.setContexts(Djs.InteractionContextType.Guild)
		.setDefaultMemberPermissions(0),
	execute: async (interaction: Djs.ChatInputCommandInteraction, _client: EClient) => {
		const f = path.resolve("N:/Documents/Github/dicelette/discord-bot/assets/dice.png");
		console.log(f);
		const attachment = new Djs.AttachmentBuilder(f, { name: "image1.png" });

		const embed = new Djs.EmbedBuilder()
			.setTitle("Attachments")
			.setThumbnail(`attachment://${attachment.name}`);

		if (
			!interaction.channel ||
			!interaction.channel.isTextBased() ||
			interaction.channel.isDMBased()
		)
			return;
		const message = await interaction.reply({
			embeds: [embed],
			files: [attachment],
		});
		const msg = await interaction.fetchReply();
		//test reupload another image
		const f2 = path.resolve(
			"N:/Documents/Github/dicelette/discord-bot/assets/player.png"
		);
		const newAttachment = new Djs.AttachmentBuilder(f2, { name: "image2.png" });
		const newEmbed = Djs.EmbedBuilder.from(embed)
			.setThumbnail(`attachment://${newAttachment.name}`)
			.setTitle("Reuploaded");
		await msg.edit({ embeds: [newEmbed], files: [newAttachment] });
	},
};
