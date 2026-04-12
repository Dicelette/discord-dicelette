import { Icon } from "@iconify/react";
import ToggleButton from "@mui/material/ToggleButton";
import { useI18n } from "@shared";
import { getDesktopToggleSx, MOBILE_TOGGLE_SX } from "./styles";

type ToggleOpt = "naturalDice" | "affectSkill" | "excludedStat";

type OptConfig = {
	titleKey: string;
	value: string;
	color: "info" | "warning" | "success" | "secondary" | "primary";
	icon: { selected: string; unselected: string };
};

const OPT_CONFIG: Record<ToggleOpt, OptConfig> = {
	naturalDice: {
		titleKey: "template.onNaturalDice",
		value: "onNaturalDice",
		color: "warning",
		icon: {
			selected: "game-icons:dice-target",
			unselected: "game-icons:perspective-dice-six-faces-three",
		},
	},
	excludedStat: {
		titleKey: "template.excluded",
		value: "excludedStat",
		color: "info",
		icon: {
			selected: "fluent:table-simple-exclude-16-regular",
			unselected: "fluent:table-simple-include-16-filled",
		},
	},
	affectSkill: {
		titleKey: "template.affectSkill",
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
	const { t } = useI18n();
	const cfg = OPT_CONFIG[opt];
	const title = t(cfg.titleKey);

	return (
		<>
			<ToggleButton
				value={cfg.value}
				size="small"
				selected={selected}
				onChange={onChange}
				color={cfg.color}
				aria-label={title}
				title={title}
				sx={MOBILE_TOGGLE_SX}
			>
				<Icon icon={cfg.icon.selected} height="20" />
				{title}
			</ToggleButton>
			<Tooltip cfg={cfg} title={title} selected={selected} onChange={onChange} />
		</>
	);
}

// Separate component so the tooltip title is stable (no inline object creation)
function Tooltip({
	cfg,
	title,
	selected,
	onChange,
}: {
	cfg: OptConfig;
	title: string;
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
			aria-label={title}
			title={title}
			sx={getDesktopToggleSx(color, selected)}
		>
			<Icon icon={selected ? cfg.icon.selected : cfg.icon.unselected} height="28" />
		</ToggleButton>
	);
}
