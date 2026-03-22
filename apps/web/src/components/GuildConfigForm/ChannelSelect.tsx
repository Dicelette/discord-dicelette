import { Autocomplete, FormHelperText, TextField } from "@mui/material";
import { memo } from "react";
import type { Channel } from "./types";

interface ChannelSelectProps {
	label: string;
	value: string | undefined;
	channels: Channel[];
	helperText?: string;
	onChange: (v: string) => void;
}

const ChannelSelect = memo(
	({ label, value, channels, helperText, onChange }: ChannelSelectProps) => {
		const selected = channels.find((c) => c.id === value) ?? null;
		return (
			<>
				<Autocomplete
					fullWidth
					size="small"
					options={channels}
					getOptionLabel={(c) => `# ${c.name}`}
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
