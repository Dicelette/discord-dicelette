import { getInteractionContext as getLangAndConfig } from "@dicelette/bot-helpers";
import type { EClient } from "@dicelette/client";
import { t } from "@dicelette/localization";
import * as Djs from "discord.js";
import { deleteAfter, reply, setTags } from "messages";
import moment from "moment";
import "discord_ext";

export default {
	data: new Djs.SlashCommandBuilder()
		.setNames("scene.name")
		.setContexts(Djs.InteractionContextType.Guild)
		.setIntegrationTypes(Djs.ApplicationIntegrationType.GuildInstall)
		.setDescriptions("scene.description")
		.addStringOption((option) =>
			option
				.setNames("scene.name")
				.setDescriptions("scene.option.description")
				.setRequired(false)
		)
		.addBooleanOption((option) =>
			option
				.setNames("scene.time.name")
				.setDescriptions("scene.time.description")
				.setRequired(false)
		),
	async execute(
		interaction: Djs.ChatInputCommandInteraction,
		client: EClient
	): Promise<void> {
		if (!interaction.guild) return;
		const allCommands = await interaction.guild.commands.fetch();
		const channel = interaction.channel;
		if (!channel || channel.isDMBased() || !channel.isTextBased()) return;

		const option = interaction.options as Djs.CommandInteractionOptionResolver;
		const scene = option.getString(t("scene.name"));
		const bubble = option.getBoolean(t("scene.time.name"));
		const { ul } = getLangAndConfig(client, interaction);
		if (!scene && !bubble) {
			await reply(interaction, {
				content: ul("scene.noScene"),
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		const noPermMsg = ul("scene.noPermission");
		//verify the permission for creating thread
		const botMember =
			interaction.guild.members.me ??
			(await interaction.guild.members.fetchMe().catch(() => null));
		if (!botMember) {
			await reply(interaction, {
				content: noPermMsg,
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		const botPerms = channel.permissionsFor(botMember, true);

		if (
			!botPerms ||
			!botPerms.has([
				Djs.PermissionFlagsBits.CreatePublicThreads,
				Djs.PermissionFlagsBits.ViewChannel,
			])
		) {
			await reply(interaction, {
				content: noPermMsg,
				flags: Djs.MessageFlags.Ephemeral,
			});
			return;
		}
		//archive old threads
		// noinspection SuspiciousTypeOfGuard
		const isTextChannel = channel instanceof Djs.TextChannel;
		if (
			(channel.parent && channel.parent.type === Djs.ChannelType.GuildForum) ||
			!channel.name.decode().startsWith("🎲")
		) {
			const threads = isTextChannel
				? channel.threads.cache.filter(
						(thread) => thread.name.decode().startsWith("🎲") && !thread.archived
					)
				: (channel.parent as Djs.ForumChannel).threads.cache.filter(
						(thread) => thread.name === `🎲 ${scene}` && !thread.archived
					);
			for (const thread of threads) {
				await thread[1].setArchived(true);
			}
			let threadName = "";
			if (bubble) {
				threadName = scene ? ` ⏲ ${scene}` : ` ⏲ ${moment().format("DD-MM-YYYY")}`;
			} else threadName = `🎲 ${scene}`;

			if (threadName.includes("{{date}}"))
				threadName = threadName.replace("{{date}}", moment().format("DD-MM-YYYY"));
			const newThread = isTextChannel
				? await channel.threads.create({
						name: threadName,
						reason: ul("scene.reason"),
					})
				: await (channel.parent as Djs.ForumChannel).threads.create({
						appliedTags: [
							(await setTags(channel.parent as Djs.ForumChannel)).id as string,
						],
						message: { content: ul("scene.reason") },
						name: threadName,
					});

			const threadMention = Djs.channelMention(newThread.id);
			const msgReply = await reply(interaction, {
				content: ul("scene.interaction", { scene: threadMention }),
			});
			const time = client.settings.get(interaction.guild.id, "deleteAfter") ?? 180000;
			await deleteAfter(msgReply, time);
			const rollID = allCommands.findKey((command) => command.name === "roll");
			const msgToEdit = await newThread.send("_ _");
			const msg = `${Djs.userMention(interaction.user.id)} - <t:${moment().unix()}:R>\n${ul("scene.underscore")} ${scene}\n*roll: </roll:${rollID}>*`;
			await msgToEdit.edit(msg);
		}
		return;
	},
};
