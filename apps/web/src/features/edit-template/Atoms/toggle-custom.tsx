import { Icon } from "@iconify/react";
import ToggleButton from "@mui/material/ToggleButton";
import { useCompact } from "./CompactContext";

type ToggleOpt = "naturalDice" | "affectSkill" | "excludedStat";

type OptConfig = {
	title: string;
	value: string;
	color: "info" | "warning" | "success" | "secondary" | "primary";
	icon: { selected: string; unselected: string };
};

const OPT_CONFIG: Record<ToggleOpt, OptConfig> = {
	naturalDice: {
		title: "Affecter uniquement les dés naturels",
		value: "onNaturalDice",
		color: "warning",
		icon: {
			selected: "game-icons:dice-target",
			unselected: "game-icons:perspective-dice-six-faces-three",
		},
	},
	excludedStat: {
		title: "Exclure de la sélection des dés de statistiques",
		value: "excludedStat",
		color: "info",
		icon: {
			selected: "fluent:table-simple-exclude-16-regular",
			unselected: "fluent:table-simple-include-16-filled",
		},
	},
	affectSkill: {
		title: "Utilisable sur les macros",
		value: "affectSkill",
		color: "secondary",
		icon: {
			selected: "pepicons-pencil:sword-shield-circle",
			unselected: "pepicons-pencil:sword-shield-circle-off",
		},
	},
};

type StandaloneToggleButtonProps = {
	selected: boolean;
	onChange: () => void;
	opt: ToggleOpt;
};

export default function StandaloneToggleButton({
	selected,
	onChange,
	opt,
}: StandaloneToggleButtonProps) {
	const isNarrow = useCompact();
	const cfg = OPT_CONFIG[opt];

	return isNarrow ? (
		<ToggleButton
			value={cfg.value}
			size="small"
			selected={selected}
			onChange={onChange}
			color={cfg.color}
			aria-label={cfg.title}
			title={cfg.title}
			sx={{ p: 1, width: "100%", justifyContent: "flex-start", gap: 1 }}
		>
			<Icon icon={cfg.icon.selected} height="20" />
			{cfg.title}
		</ToggleButton>
	) : (
		<Tooltip cfg={cfg} selected={selected} onChange={onChange} />
	);
}

// Separate component so the tooltip title is stable (no inline object creation)
function Tooltip({
	cfg,
	selected,
	onChange,
}: {
	cfg: OptConfig;
	selected: boolean;
	onChange: () => void;
}) {
	const color = cfg.color;
	return (
		<ToggleButton
			value={cfg.value}
			size="small"
			onChange={onChange}
			selected={selected}
			aria-label={cfg.title}
			title={cfg.title}
			sx={{
				p: "3px",
				border: "none",
				borderRadius: 1,
				// Icon always shows the semantic color; full opacity when active
				color: selected ? "common.white" : `${color}.main`,
				bgcolor: selected ? `${color}.main` : "transparent",
				"&:hover": {
					bgcolor: `${color}.main`,
					color: "common.white",
					opacity: 0.85,
				},
				"&.Mui-selected:hover": {
					bgcolor: `${color}.dark`,
					opacity: 1,
				},
			}}
		>
			<Icon icon={selected ? cfg.icon.selected : cfg.icon.unselected} height="28" />
		</ToggleButton>
	);
}
