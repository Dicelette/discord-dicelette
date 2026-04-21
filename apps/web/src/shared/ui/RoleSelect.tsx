import { Autocomplete, FormHelperText, TextField } from "@mui/material";
import { memo } from "react";
import type { Role } from "../types.ts";

interface RoleSelectProps {
	label: string;
	value: string | undefined;
	roles: Role[];
	helperText?: string;
	onChange: (v: string) => void;
}

const RoleSelect = memo(
	({ label, value, roles, helperText, onChange }: RoleSelectProps) => {
		const selected = roles.find((r) => r.id === value) ?? null;
		return (
			<>
				<Autocomplete
					fullWidth
					size="small"
					options={roles}
					getOptionLabel={(r) => `@ ${r.name}`}
					value={selected}
					onChange={(_, newValue) => onChange(newValue?.id ?? "")}
					renderInput={(params) => (
						<TextField
							{...params}
							label={label}
							slotProps={{
								...params.slotProps,
								input: { ...params.slotProps.input },
								htmlInput: { ...params.slotProps.htmlInput },
							}}
						/>
					)}
				/>
				{helperText && <FormHelperText>{helperText}</FormHelperText>}
			</>
		);
	}
);
RoleSelect.displayName = "RoleSelect";

export default RoleSelect;
