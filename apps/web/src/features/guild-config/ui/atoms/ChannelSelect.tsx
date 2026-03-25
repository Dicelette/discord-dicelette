import {
	Autocomplete,
	FormHelperText,
	ListSubheader,
	TextField,
	createFilterOptions,
} from "@mui/material";
import { memo, useMemo } from "react";
import type { Channel } from "../../types";

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
	({ label, value, channels, allChannels, helperText, onChange, disabled }: ChannelSelectProps) => {
		const selected = channels.find((c) => c.id === value) ?? null;

		const categoryMap = useMemo(() => {
			const src = allChannels ?? channels;
			return new Map(src.filter((c) => c.type === 4).map((c) => [c.id, c.name]));
		}, [allChannels, channels]);

		const sortedChannels = useMemo(() => {
			return [...channels].sort((a, b) => {
				const parentA = a.parent_id ? (categoryMap.get(a.parent_id) ?? "") : "\uFFFF";
				const parentB = b.parent_id ? (categoryMap.get(b.parent_id) ?? "") : "\uFFFF";
				if (parentA !== parentB) return parentA.localeCompare(parentB);
				return a.name.localeCompare(b.name);
			});
		}, [channels, categoryMap]);

		return (
			<>
				<Autocomplete
					fullWidth
					size="small"
					disabled={disabled}
					options={sortedChannels}
					getOptionKey={(c) => c.id}
					getOptionLabel={(c) => {
						const parent = c.parent_id ? (categoryMap.get(c.parent_id) ?? "") : "";
						return parent ? `#${parent}/${c.name}` : `# ${c.name}`;
					}}
					groupBy={(c) => (c.parent_id ? (categoryMap.get(c.parent_id) ?? "") : "")}
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
