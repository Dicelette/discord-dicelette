import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { memo } from "react";
import type { Role } from "./types";

interface RoleSelectProps {
	label: string;
	value: string | undefined;
	roles: Role[];
	noneLabel: string;
	onChange: (v: string) => void;
}

const RoleSelect = memo(
	({ label, value, roles, noneLabel, onChange }: RoleSelectProps) => (
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
				{roles.map((r) => (
					<MenuItem key={r.id} value={r.id}>
						@ {r.name}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	)
);
RoleSelect.displayName = "RoleSelect";

export default RoleSelect;
