import {
	Autocomplete,
	createFilterOptions,
	FormHelperText,
	ListSubheader,
	TextField,
} from "@mui/material";
import { memo, useMemo } from "react";
import type { Channel } from "../types";
import { getChannelParentPath, getChannelPath } from "../utils";

interface ChannelSelectProps {
	label: string;
	value: string | undefined;
	channels: Channel[];
	allChannels?: Channel[];
	helperText?: string;
	disabled?: boolean;
	onChange: (v: string) => void;
}

const filter = createFilterOptions<Channel>();

const ChannelSelect = memo(
	({
		label,
		value,
		channels,
		allChannels,
		helperText,
		onChange,
		disabled,
	}: ChannelSelectProps) => {
		const selected = channels.find((c) => c.id === value) ?? null;
		const channelSource = allChannels ?? channels;

		const parentPathMap = useMemo(() => {
			return new Map(
				channelSource.map((channel) => [
					channel.id,
					getChannelParentPath(channel, channelSource),
				])
			);
		}, [channelSource]);

		const sortedChannels = useMemo(() => {
			return [...channels].sort((a, b) => {
				const parentA = parentPathMap.get(a.id) || "\uFFFF";
				const parentB = parentPathMap.get(b.id) || "\uFFFF";
				if (parentA !== parentB) return parentA.localeCompare(parentB);
				return a.name.localeCompare(b.name);
			});
		}, [channels, parentPathMap]);

		return (
			<>
				<Autocomplete
					fullWidth
					size="small"
					disabled={disabled}
					options={sortedChannels}
					getOptionKey={(c) => c.id}
					getOptionLabel={(c) => getChannelPath(c, channelSource)}
					groupBy={(c) => parentPathMap.get(c.id) ?? ""}
					filterOptions={(opts, state) => {
						const filtered = filter(opts, state);
						return state.inputValue ? filtered : filtered.slice(0, 10);
					}}
					renderGroup={(params) => (
						<li key={params.key}>
							{params.group && (
								<ListSubheader component="div" disableSticky>
									{params.group}
								</ListSubheader>
							)}
							<ul style={{ padding: 0 }}>{params.children}</ul>
						</li>
					)}
					value={selected}
					onChange={(_, newValue) => onChange(newValue?.id ?? "")}
					renderInput={(params) => (
						<TextField
							{...params}
							label={label}
							slotProps={{
								input: { ...params.InputProps },
								htmlInput: { ...params.inputProps },
							}}
						/>
					)}
				/>
				{helperText && <FormHelperText>{helperText}</FormHelperText>}
			</>
		);
	}
);
ChannelSelect.displayName = "ChannelSelect";

export default ChannelSelect;
