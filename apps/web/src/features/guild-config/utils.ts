import type { Channel } from "./types";

function getChannelMap(channels: readonly Channel[]) {
	return new Map(channels.map((channel) => [channel.id, channel]));
}

function getAncestorNames(channel: Channel, channelMap: ReadonlyMap<string, Channel>) {
	const names: string[] = [];
	const seen = new Set<string>([channel.id]);
	let parentId = channel.parent_id;

	while (parentId) {
		const parent = channelMap.get(parentId);
		if (!parent || seen.has(parent.id)) break;
		names.unshift(parent.name);
		seen.add(parent.id);
		parentId = parent.parent_id;
	}

	return names;
}

export function getChannelParentPath(channel: Channel, channels: readonly Channel[]) {
	return getAncestorNames(channel, getChannelMap(channels)).join("/");
}

export function getChannelPath(channel: Channel, channels: readonly Channel[]) {
	const channelMap = getChannelMap(channels);
	const names = [...getAncestorNames(channel, channelMap), channel.name];
	return `#${names.join("/")}`;
}

export function getChannelPathById(
	channelId: string | undefined,
	channels: readonly Channel[]
) {
	if (!channelId) return undefined;
	const channelMap = getChannelMap(channels);
	const channel = channelMap.get(channelId);
	if (!channel) return undefined;
	const names = [...getAncestorNames(channel, channelMap), channel.name];
	return `#${names.join("/")}`;
}

export function millisecondsToSeconds(value: number | undefined | null) {
	return Math.round((value ?? 0) / 1000);
}

export function secondsToMilliseconds(value: number | undefined | null) {
	return (value ?? 0) * 1000;
}
