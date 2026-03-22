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
import { memo, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
	{ value: "en-US", label: "English" },
	{ value: "fr", label: "Français" },
];

const SectionTitle = memo(({ children }: { children: React.ReactNode }) => (
	<Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1, opacity: 0.9 }}>
		{children}
	</Typography>
));
SectionTitle.displayName = "SectionTitle";

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

export default function GuildConfigForm({ config, guildId, onSave, saving }: Props) {
	const { t } = useI18n();

	const { control, handleSubmit, reset, watch, formState } = useForm<ApiGuildConfig>({
		defaultValues: config,
	});

	const isDirty = formState.isDirty;

	useEffect(() => {
		reset(config);
	}, [config, reset]);

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

	const [channels, setChannels] = useState<Channel[]>([]);
	const [roles, setRoles] = useState<Role[]>([]);

	useEffect(() => {
		if (!isDirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [isDirty]);

	const textChannels = useMemo(() => channels.filter((c) => c.type === 0), [channels]);

	const sortOrders = useMemo(
		() => [
			{ value: "", label: t("config.fields.sortNone") },
			{ value: "ascending", label: t("config.sort.options.ascending") },
			{ value: "descending", label: t("config.sort.options.descending") },
		],
		[t]
	);

	const noneLabel = t("common.none");

	const hiddenRoll = watch("hiddenRoll");
	const allowSelfRegister = watch("allowSelfRegister");
	const stripOOC = watch("stripOOC");

	return (
		<Box component="form" onSubmit={handleSubmit(onSave)}>
			{isDirty && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					{t("config.unsaved")}
				</Alert>
			)}

			<Paper sx={{ p: 3, mb: 2 }}>
				<SectionTitle>{t("config.sections.general")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						name="lang"
						control={control}
						render={({ field }) => (
							<FormControl fullWidth size="small">
								<InputLabel>{t("config.fields.lang")}</InputLabel>
								<Select
									{...field}
									value={field.value ?? "en-US"}
									label={t("config.fields.lang")}
								>
									{DISCORD_LOCALES.map((l) => (
										<MenuItem key={l.value} value={l.value}>
											{l.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						)}
					/>
					<Controller
						name="sortOrder"
						control={control}
						render={({ field }) => (
							<FormControl fullWidth size="small">
								<InputLabel>{t("config.fields.sortOrder")}</InputLabel>
								<Select
									{...field}
									value={field.value ?? ""}
									label={t("config.fields.sortOrder")}
									onChange={(e) => field.onChange(e.target.value || undefined)}
								>
									{sortOrders.map((s) => (
										<MenuItem key={s.value} value={s.value}>
											{s.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						)}
					/>
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.channels")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						name="logs"
						control={control}
						render={({ field }) => (
							<ChannelSelect
								label={t("config.fields.logs")}
								value={field.value}
								channels={textChannels}
								noneLabel={noneLabel}
								onChange={(v) => field.onChange(v || undefined)}
							/>
						)}
					/>
					<Controller
						name="rollChannel"
						control={control}
						render={({ field }) => (
							<ChannelSelect
								label={t("config.fields.rollChannel")}
								value={field.value}
								channels={textChannels}
								noneLabel={noneLabel}
								onChange={(v) => field.onChange(v || undefined)}
							/>
						)}
					/>
					<Controller
						name="managerId"
						control={control}
						render={({ field }) => (
							<ChannelSelect
								label={t("config.fields.defaultChannel")}
								value={field.value}
								channels={textChannels}
								noneLabel={noneLabel}
								onChange={(v) => field.onChange(v || undefined)}
							/>
						)}
					/>
					<Controller
						name="privateChannel"
						control={control}
						render={({ field }) => (
							<ChannelSelect
								label={t("config.fields.privateChannel")}
								value={field.value}
								channels={textChannels}
								noneLabel={noneLabel}
								onChange={(v) => field.onChange(v || undefined)}
							/>
						)}
					/>
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.autoRole")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						name="autoRole.stats"
						control={control}
						render={({ field }) => (
							<RoleSelect
								label={t("config.fields.autoRoleStats")}
								value={field.value}
								roles={roles}
								noneLabel={noneLabel}
								onChange={(v) => field.onChange(v || undefined)}
							/>
						)}
					/>
					<Controller
						name="autoRole.dice"
						control={control}
						render={({ field }) => (
							<RoleSelect
								label={t("config.fields.autoRoleDice")}
								value={field.value}
								roles={roles}
								noneLabel={noneLabel}
								onChange={(v) => field.onChange(v || undefined)}
							/>
						)}
					/>
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.diceBehaviour")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{(
						[
							["disableThread", "config.fields.disableThread"],
							["timestamp", "config.fields.timestamp"],
							["context", "config.fields.context"],
							["linkToLogs", "config.fields.linkToLogs"],
							["disableCompare", "config.fields.disableCompare"],
						] as const
					).map(([name, labelKey]) => (
						<Controller
							key={name}
							name={name}
							control={control}
							render={({ field }) => (
								<FormControlLabel
									control={
										<Switch
											checked={!!field.value}
											onChange={(e) => field.onChange(e.target.checked || undefined)}
										/>
									}
									label={t(labelKey)}
								/>
							)}
						/>
					))}
				</Box>

				<Box sx={{ mt: 3 }}>
					<Controller
						name="deleteAfter"
						control={control}
						render={({ field }) => (
							<>
								<Typography variant="body2" gutterBottom>
									{t("config.fields.deleteAfter", { val: field.value ?? 0 })}
								</Typography>
								<Slider
									value={field.value ?? 0}
									min={0}
									max={3600}
									step={30}
									onChange={(_, v) => field.onChange((v as number) || undefined)}
									valueLabelDisplay="auto"
									sx={{ maxWidth: 400 }}
								/>
							</>
						)}
					/>
				</Box>

				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
					<Controller
						name="pity"
						control={control}
						render={({ field }) => (
							<TextField
								label={t("config.fields.pity")}
								type="number"
								size="small"
								value={field.value ?? ""}
								onChange={(e) =>
									field.onChange(e.target.value ? Number(e.target.value) : undefined)
								}
								slotProps={{ htmlInput: { min: 0 } }}
							/>
						)}
					/>
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.selfRegister")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						name="allowSelfRegister"
						control={control}
						render={({ field }) => (
							<FormControlLabel
								control={
									<Switch
										checked={!!field.value}
										onChange={(e) => field.onChange(e.target.checked || undefined)}
									/>
								}
								label={t("config.fields.allowSelfRegister")}
							/>
						)}
					/>
					{allowSelfRegister && typeof allowSelfRegister !== "boolean" && (
						<Controller
							name="allowSelfRegister"
							control={control}
							render={({ field }) => (
								<TextField
									label={t("config.fields.moderationChannel")}
									size="small"
									value={typeof field.value === "string" ? field.value : ""}
									onChange={(e) => field.onChange(e.target.value || true)}
									helperText={t("config.fields.moderationChannelHelp")}
								/>
							)}
						/>
					)}
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.hiddenRolls")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						name="hiddenRoll"
						control={control}
						render={({ field }) => (
							<FormControlLabel
								control={
									<Switch
										checked={!!field.value}
										onChange={(e) => field.onChange(e.target.checked || undefined)}
									/>
								}
								label={t("config.fields.hiddenRollEnable")}
							/>
						)}
					/>
					{hiddenRoll && (
						<>
							<Controller
								name="hiddenRoll"
								control={control}
								render={({ field }) => (
									<FormControlLabel
										control={
											<Switch
												checked={field.value === true}
												onChange={(e) => field.onChange(e.target.checked ? true : "")}
											/>
										}
										label={t("config.fields.hiddenRollDm")}
									/>
								)}
							/>
							{hiddenRoll !== true && (
								<Controller
									name="hiddenRoll"
									control={control}
									render={({ field }) => (
										<TextField
											label={t("config.fields.channelId")}
											size="small"
											value={typeof field.value === "string" ? field.value : ""}
											onChange={(e) => field.onChange(e.target.value)}
										/>
									)}
								/>
							)}
						</>
					)}
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>{t("config.sections.stripOoc")}</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						name="stripOOC"
						control={control}
						render={({ field }) => (
							<FormControlLabel
								control={
									<Switch
										checked={field.value !== undefined}
										onChange={(e) => field.onChange(e.target.checked ? {} : undefined)}
									/>
								}
								label={t("config.fields.stripOocEnable")}
							/>
						)}
					/>
				</Box>
				{stripOOC !== undefined && (
					<Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
						<Controller
							name="stripOOC.regex"
							control={control}
							render={({ field }) => (
								<TextField
									label={t("config.fields.stripOocRegex")}
									size="small"
									fullWidth
									value={field.value ?? ""}
									onChange={(e) => field.onChange(e.target.value || undefined)}
									helperText={t("config.fields.stripOocRegexHelp")}
								/>
							)}
						/>
						<Box>
							<Controller
								name="stripOOC.timer"
								control={control}
								render={({ field }) => (
									<>
										<Typography variant="body2" gutterBottom>
											{t("config.fields.stripOocDelay", {
												val: field.value ? field.value / 1000 : 0,
											})}
										</Typography>
										<Slider
											value={field.value ? field.value / 1000 : 0}
											min={0}
											max={3600}
											step={30}
											onChange={(_, v) =>
												field.onChange((v as number) ? (v as number) * 1000 : undefined)
											}
											valueLabelDisplay="auto"
											sx={{ maxWidth: 400 }}
										/>
									</>
								)}
							/>
						</Box>
						<Controller
							name="stripOOC.categoryId"
							control={control}
							render={({ field }) => (
								<FormControl fullWidth size="small">
									<InputLabel>{t("config.fields.stripOocChannels")}</InputLabel>
									<Select
										multiple
										value={field.value ?? []}
										label={t("config.fields.stripOocChannels")}
										onChange={(e) =>
											field.onChange(
												(e.target.value as string[]).length
													? (e.target.value as string[])
													: undefined
											)
										}
									>
										{channels.map((c) => (
											<MenuItem key={c.id} value={c.id}>
												{c.type === 4 ? "📂" : "#"} {c.name}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							)}
						/>
						<Controller
							name="stripOOC.forwardId"
							control={control}
							render={({ field }) => (
								<ChannelSelect
									label={t("config.fields.stripOocForward")}
									value={field.value}
									channels={textChannels}
									noneLabel={noneLabel}
									onChange={(v) => field.onChange(v || undefined)}
								/>
							)}
						/>
						<Controller
							name="stripOOC.threadMode"
							control={control}
							render={({ field }) => (
								<FormControlLabel
									control={
										<Switch
											checked={!!field.value}
											onChange={(e) => field.onChange(e.target.checked || undefined)}
										/>
									}
									label={t("config.fields.stripOocThreadMode")}
								/>
							)}
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
