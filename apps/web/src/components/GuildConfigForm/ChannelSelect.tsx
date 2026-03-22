import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { memo } from "react";
import type { Channel } from "./types";

interface ChannelSelectProps {
	label: string;
	value: string | undefined;
	channels: Channel[];
	noneLabel: string;
	onChange: (v: string) => void;
}

const ChannelSelect = memo(
	({ label, value, channels, noneLabel, onChange }: ChannelSelectProps) => (
		<FormControl fullWidth size="small">
			<InputLabel>{label}</InputLabel>
			<Select
				value={value ?? ""}
				label={label}
				onChange={(e) => onChange(e.target.value)}
			>
				<MenuItem value="">
					<em>{noneLabel}</em>
				</MenuItem>
				{channels.map((c) => (
					<MenuItem key={c.id} value={c.id}>
						# {c.name}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	)
);
ChannelSelect.displayName = "ChannelSelect";

export default ChannelSelect;
