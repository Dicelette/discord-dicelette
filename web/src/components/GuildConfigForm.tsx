import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import type { ApiGuildConfig } from "../lib/api";
import { guildApi } from "../lib/api";

interface Channel {
	id: string;
	name: string;
	type: number;
}

interface Role {
	id: string;
	name: string;
	color: number;
}

interface Props {
	config: ApiGuildConfig;
	guildId: string;
	onSave: (updates: Partial<ApiGuildConfig>) => Promise<void>;
	saving: boolean;
}

const DISCORD_LOCALES = [
	{ value: "en-US", label: "English (US)" },
	{ value: "en-GB", label: "English (GB)" },
	{ value: "fr", label: "Français" },
	{ value: "de", label: "Deutsch" },
	{ value: "es-ES", label: "Español" },
	{ value: "pt-BR", label: "Português (BR)" },
	{ value: "it", label: "Italiano" },
	{ value: "pl", label: "Polski" },
	{ value: "ru", label: "Русский" },
	{ value: "ja", label: "日本語" },
	{ value: "ko", label: "한국어" },
	{ value: "zh-CN", label: "中文 (简体)" },
];

export default function GuildConfigForm({ config, guildId, onSave, saving }: Props) {
	const { t } = useI18n();
	const [local, setLocal] = useState<ApiGuildConfig>(config);
	const [channels, setChannels] = useState<Channel[]>([]);
	const [roles, setRoles] = useState<Role[]>([]);

	const isDirty = JSON.stringify(local) !== JSON.stringify(config);

	useEffect(() => {
		setLocal(config);
	}, [config]);

	useEffect(() => {
		guildApi
			.getChannels(guildId)
			.then((r) => setChannels(r.data))
			.catch(() => {});
		guildApi
			.getRoles(guildId)
			.then((r) => setRoles(r.data))
			.catch(() => {});
	}, [guildId]);

	useEffect(() => {
		if (!isDirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [isDirty]);

	const textChannels = channels.filter((c) => c.type === 0);

	const set = <K extends keyof ApiGuildConfig>(key: K, value: ApiGuildConfig[K]) => {
		setLocal((prev) => ({ ...prev, [key]: value }));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(local);
	};

	const SectionTitle = ({ children }: { children: React.ReactNode }) => (
		<Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1, opacity: 0.9 }}>
			{children}
		</Typography>
	);

	const channelSelect = (
		label: string,
		value: string | undefined,
		onChange: (v: string) => void
	) => (
		<FormControl fullWidth size="small">
			<InputLabel>{label}</InputLabel>
			<Select
				value={value ?? ""}
				label={label}
				onChange={(e) => onChange(e.target.value)}
			>
				<MenuItem value="">
					<em>{t("common.none")}</em>
				</MenuItem>
				{textChannels.map((c) => (
					<MenuItem key={c.id} value={c.id}>
						# {c.name}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);

	const roleSelect = (
		label: string,
		value: string | undefined,
		onChange: (v: string) => void
	) => (
		<FormControl fullWidth size="small">
			<InputLabel>{label}</InputLabel>
			<Select
				value={value ?? ""}
				label={label}
				onChange={(e) => onChange(e.target.value)}
			>
				<MenuItem value="">
					<em>{t("common.none")}</em>
				</MenuItem>
				{roles.map((r) => (
					<MenuItem key={r.id} value={r.id}>
						@ {r.name}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);

	const sortOrders = [
		{ value: "", label: t("config.fields.sortNone") },
		{ value: "ascending", label: t("config.fields.sortAsc") },
		{ value: "descending", label: t("config.fields.sortDesc") },
	];

	return (
		<Box component="form" onSubmit={handleSubmit}>
			{isDirty && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					{t("config.unsaved")}
				</Alert>
			)}

			<Paper sx={{ p: 3, mb: 2 }}>
				<SectionTitle>{t("config.sections.general")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormControl fullWidth size="small">
						<InputLabel>{t("config.fields.lang")}</InputLabel>
						<Select
							value={local.lang ?? "en-US"}
							label={t("config.fields.lang")}
							onChange={(e) => set("lang", e.target.value)}
						>
							{DISCORD_LOCALES.map((l) => (
								<MenuItem key={l.value} value={l.value}>
									{l.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl fullWidth size="small">
						<InputLabel>{t("config.fields.sortOrder")}</InputLabel>
						<Select
							value={local.sortOrder ?? ""}
							label={t("config.fields.sortOrder")}
							onChange={(e) => set("sortOrder", e.target.value || undefined)}
						>
							{sortOrders.map((s) => (
								<MenuItem key={s.value} value={s.value}>
									{s.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.channels")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{channelSelect(t("config.fields.logs"), local.logs, (v) =>
						set("logs", v || undefined)
					)}
					{channelSelect(t("config.fields.rollChannel"), local.rollChannel, (v) =>
						set("rollChannel", v || undefined)
					)}
					{channelSelect(t("config.fields.defaultChannel"), local.managerId, (v) =>
						set("managerId", v || undefined)
					)}
					{channelSelect(t("config.fields.privateChannel"), local.privateChannel, (v) =>
						set("privateChannel", v || undefined)
					)}
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.autoRoles")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{roleSelect(t("config.fields.autoRoleStats"), local.autoRole?.stats, (v) =>
						set("autoRole", { ...local.autoRole, stats: v || undefined })
					)}
					{roleSelect(t("config.fields.autoRoleDice"), local.autoRole?.dice, (v) =>
						set("autoRole", { ...local.autoRole, dice: v || undefined })
					)}
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.diceBehaviour")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormControlLabel
						control={
							<Switch
								checked={!!local.disableThread}
								onChange={(e) => set("disableThread", e.target.checked || undefined)}
							/>
						}
						label={t("config.fields.disableThread")}
					/>
					<FormControlLabel
						control={
							<Switch
								checked={!!local.timestamp}
								onChange={(e) => set("timestamp", e.target.checked || undefined)}
							/>
						}
						label={t("config.fields.timestamp")}
					/>
					<FormControlLabel
						control={
							<Switch
								checked={!!local.context}
								onChange={(e) => set("context", e.target.checked || undefined)}
							/>
						}
						label={t("config.fields.context")}
					/>
					<FormControlLabel
						control={
							<Switch
								checked={!!local.linkToLogs}
								onChange={(e) => set("linkToLogs", e.target.checked || undefined)}
							/>
						}
						label={t("config.fields.linkToLogs")}
					/>
					<FormControlLabel
						control={
							<Switch
								checked={!!local.disableCompare}
								onChange={(e) => set("disableCompare", e.target.checked || undefined)}
							/>
						}
						label={t("config.fields.disableCompare")}
					/>
				</Box>

				<Box sx={{ mt: 3 }}>
					<Typography variant="body2" gutterBottom>
						{t("config.fields.deleteAfter", { val: local.deleteAfter ?? 0 })}
					</Typography>
					<Slider
						value={local.deleteAfter ?? 0}
						min={0}
						max={3600}
						step={30}
						onChange={(_, v) => set("deleteAfter", (v as number) || undefined)}
						valueLabelDisplay="auto"
						sx={{ maxWidth: 400 }}
					/>
				</Box>

				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
					<TextField
						label={t("config.fields.pity")}
						type="number"
						size="small"
						value={local.pity ?? ""}
						onChange={(e) =>
							set("pity", e.target.value ? Number(e.target.value) : undefined)
						}
						inputProps={{ min: 0 }}
					/>
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.selfRegister")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormControlLabel
						control={
							<Switch
								checked={!!local.allowSelfRegister}
								onChange={(e) => set("allowSelfRegister", e.target.checked || undefined)}
							/>
						}
						label={t("config.fields.allowSelfRegister")}
					/>
					{local.allowSelfRegister && typeof local.allowSelfRegister !== "boolean" && (
						<TextField
							label={t("config.fields.moderationChannel")}
							size="small"
							value={
								typeof local.allowSelfRegister === "string" ? local.allowSelfRegister : ""
							}
							onChange={(e) => set("allowSelfRegister", e.target.value || true)}
							helperText={t("config.fields.moderationChannelHelp")}
						/>
					)}
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.hiddenRolls")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormControlLabel
						control={
							<Switch
								checked={!!local.hiddenRoll}
								onChange={(e) => set("hiddenRoll", e.target.checked || undefined)}
							/>
						}
						label={t("config.fields.hiddenRollEnable")}
					/>
					{local.hiddenRoll && (
						<>
							<FormControlLabel
								control={
									<Switch
										checked={local.hiddenRoll === true}
										onChange={(e) => set("hiddenRoll", e.target.checked ? true : "")}
									/>
								}
								label={t("config.fields.hiddenRollDm")}
							/>
							{local.hiddenRoll !== true && (
								<TextField
									label={t("config.fields.channelId")}
									size="small"
									value={typeof local.hiddenRoll === "string" ? local.hiddenRoll : ""}
									onChange={(e) => set("hiddenRoll", e.target.value)}
								/>
							)}
						</>
					)}
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.stripOoc")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormControlLabel
						control={
							<Switch
								checked={!!local.stripOOC}
								onChange={(e) => set("stripOOC", e.target.checked ? {} : undefined)}
							/>
						}
						label={t("config.fields.stripOocEnable")}
					/>
				</Box>
				{local.stripOOC !== undefined && (
					<Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
						<TextField
							label={t("config.fields.stripOocRegex")}
							size="small"
							fullWidth
							value={local.stripOOC.regex ?? ""}
							onChange={(e) =>
								set("stripOOC", {
									...local.stripOOC,
									regex: e.target.value || undefined,
								})
							}
							helperText={t("config.fields.stripOocRegexHelp")}
						/>
						<Box>
							<Typography variant="body2" gutterBottom>
								{t("config.fields.stripOocDelay", {
									val: local.stripOOC.timer ? local.stripOOC.timer / 1000 : 0,
								})}
							</Typography>
							<Slider
								value={local.stripOOC.timer ? local.stripOOC.timer / 1000 : 0}
								min={0}
								max={3600}
								step={30}
								onChange={(_, v) =>
									set("stripOOC", {
										...local.stripOOC,
										timer: (v as number) ? (v as number) * 1000 : undefined,
									})
								}
								valueLabelDisplay="auto"
								sx={{ maxWidth: 400 }}
							/>
						</Box>
						<FormControl fullWidth size="small">
							<InputLabel>{t("config.fields.stripOocChannels")}</InputLabel>
							<Select
								multiple
								value={local.stripOOC.categoryId ?? []}
								label={t("config.fields.stripOocChannels")}
								onChange={(e) =>
									set("stripOOC", {
										...local.stripOOC,
										categoryId: (e.target.value as string[]).length
											? (e.target.value as string[])
											: undefined,
									})
								}
							>
								{channels.map((c) => (
									<MenuItem key={c.id} value={c.id}>
										{c.type === 4 ? "📂" : "#"} {c.name}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						{channelSelect(
							t("config.fields.stripOocForward"),
							local.stripOOC.forwardId,
							(v) => set("stripOOC", { ...local.stripOOC, forwardId: v || undefined })
						)}
						<FormControlLabel
							control={
								<Switch
									checked={!!local.stripOOC.threadMode}
									onChange={(e) =>
										set("stripOOC", {
											...local.stripOOC,
											threadMode: e.target.checked || undefined,
										})
									}
								/>
							}
							label={t("config.fields.stripOocThreadMode")}
						/>
					</Box>
				)}
			</Paper>

			<Box className="flex justify-end gap-3 items-center">
				{isDirty && (
					<Typography variant="body2" color="warning.main">
						{t("config.unsaved")}
					</Typography>
				)}
				<Button
					type="submit"
					variant="contained"
					size="large"
					disabled={saving}
					sx={{ minWidth: 160 }}
				>
					{saving ? t("common.saving") : t("common.save")}
				</Button>
			</Box>
		</Box>
	);
}
