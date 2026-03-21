import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Slider from "@mui/material/Slider";
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

const SORT_ORDERS = [
	{ value: "", label: "Aucun (défaut)" },
	{ value: "ascending", label: "Croissant" },
	{ value: "descending", label: "Décroissant" },
];

export default function GuildConfigForm({ config, guildId, onSave, saving }: Props) {
	const [local, setLocal] = useState<ApiGuildConfig>(config);
	const [channels, setChannels] = useState<Channel[]>([]);
	const [roles, setRoles] = useState<Role[]>([]);

	useEffect(() => {
		guildApi.getChannels(guildId).then((r) => setChannels(r.data)).catch(() => {});
		guildApi.getRoles(guildId).then((r) => setRoles(r.data)).catch(() => {});
	}, [guildId]);

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
		onChange: (v: string) => void,
	) => (
		<FormControl fullWidth size="small">
			<InputLabel>{label}</InputLabel>
			<Select
				value={value ?? ""}
				label={label}
				onChange={(e) => onChange(e.target.value)}
			>
				<MenuItem value="">
					<em>Aucun</em>
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
		onChange: (v: string) => void,
	) => (
		<FormControl fullWidth size="small">
			<InputLabel>{label}</InputLabel>
			<Select
				value={value ?? ""}
				label={label}
				onChange={(e) => onChange(e.target.value)}
			>
				<MenuItem value="">
					<em>Aucun</em>
				</MenuItem>
				{roles.map((r) => (
					<MenuItem key={r.id} value={r.id}>
						@ {r.name}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);

	return (
		<Box component="form" onSubmit={handleSubmit}>
			<Paper sx={{ p: 3, mb: 2 }}>
				<SectionTitle>Langue & Général</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormControl fullWidth size="small">
						<InputLabel>Langue</InputLabel>
						<Select
							value={local.lang ?? "en-US"}
							label="Langue"
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
						<InputLabel>Ordre de tri des résultats</InputLabel>
						<Select
							value={local.sortOrder ?? ""}
							label="Ordre de tri des résultats"
							onChange={(e) => set("sortOrder", e.target.value || undefined)}
						>
							{SORT_ORDERS.map((s) => (
								<MenuItem key={s.value} value={s.value}>
									{s.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>Canaux</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{channelSelect("Canal de logs", local.logs, (v) => set("logs", v || undefined))}
					{channelSelect("Canal de résultats", local.rollChannel, (v) =>
						set("rollChannel", v || undefined),
					)}
					{channelSelect("Canal par défaut (fiches)", local.managerId, (v) =>
						set("managerId", v || undefined),
					)}
					{channelSelect("Canal privé", local.privateChannel, (v) =>
						set("privateChannel", v || undefined),
					)}
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>Rôles automatiques</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{roleSelect(
						"Rôle auto (statistiques)",
						local.autoRole?.stats,
						(v) =>
							set("autoRole", { ...local.autoRole, stats: v || undefined }),
					)}
					{roleSelect(
						"Rôle auto (dés)",
						local.autoRole?.dice,
						(v) =>
							set("autoRole", { ...local.autoRole, dice: v || undefined }),
					)}
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>Comportement des dés</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormControlLabel
						control={
							<Switch
								checked={!!local.disableThread}
								onChange={(e) => set("disableThread", e.target.checked || undefined)}
							/>
						}
						label="Désactiver les threads de résultats"
					/>
					<FormControlLabel
						control={
							<Switch
								checked={!!local.timestamp}
								onChange={(e) => set("timestamp", e.target.checked || undefined)}
							/>
						}
						label="Afficher l'horodatage dans les logs"
					/>
					<FormControlLabel
						control={
							<Switch
								checked={!!local.context}
								onChange={(e) => set("context", e.target.checked || undefined)}
							/>
						}
						label="Ajouter un lien de contexte dans les logs"
					/>
					<FormControlLabel
						control={
							<Switch
								checked={!!local.linkToLogs}
								onChange={(e) => set("linkToLogs", e.target.checked || undefined)}
							/>
						}
						label="Lier les résultats aux logs"
					/>
					<FormControlLabel
						control={
							<Switch
								checked={!!local.disableCompare}
								onChange={(e) => set("disableCompare", e.target.checked || undefined)}
							/>
						}
						label="Désactiver la comparaison succès/échec"
					/>
				</Box>

				<Box sx={{ mt: 3 }}>
					<Typography variant="body2" gutterBottom>
						Suppression automatique (secondes) : {local.deleteAfter ?? 0}s
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
						label="Seuil de pitié (échecs critiques consécutifs)"
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

				<SectionTitle>Auto-inscription</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormControlLabel
						control={
							<Switch
								checked={!!local.allowSelfRegister}
								onChange={(e) =>
									set("allowSelfRegister", e.target.checked || undefined)
								}
							/>
						}
						label="Autoriser l'auto-inscription"
					/>
					{local.allowSelfRegister && typeof local.allowSelfRegister !== "boolean" && (
						<TextField
							label="Canal de modération (optionnel)"
							size="small"
							value={
								typeof local.allowSelfRegister === "string"
									? local.allowSelfRegister
									: ""
							}
							onChange={(e) =>
								set("allowSelfRegister", e.target.value || true)
							}
							helperText="ID du canal pour modérer les inscriptions"
						/>
					)}
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>Résultats cachés (MJ)</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormControlLabel
						control={
							<Switch
								checked={!!local.hiddenRoll}
								onChange={(e) =>
									set("hiddenRoll", e.target.checked || undefined)
								}
							/>
						}
						label="Activer les jets cachés"
					/>
					{local.hiddenRoll && (
						<>
							<FormControlLabel
								control={
									<Switch
										checked={local.hiddenRoll === true}
										onChange={(e) =>
											set("hiddenRoll", e.target.checked ? true : "")
										}
									/>
								}
								label="Envoyer en MP (sinon: canal spécifique)"
							/>
							{local.hiddenRoll !== true && (
								<TextField
									label="ID du canal"
									size="small"
									value={
										typeof local.hiddenRoll === "string" ? local.hiddenRoll : ""
									}
									onChange={(e) => set("hiddenRoll", e.target.value)}
								/>
							)}
						</>
					)}
				</Box>

				<Divider sx={{ my: 3 }} />

				<SectionTitle>Suppression HRP (hors-roleplay)</SectionTitle>
				<Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormControlLabel
						control={
							<Switch
								checked={!!local.stripOOC}
								onChange={(e) =>
									set("stripOOC", e.target.checked ? {} : undefined)
								}
							/>
						}
						label="Activer la suppression HRP"
					/>
				</Box>
				{local.stripOOC !== undefined && (
					<Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
						<TextField
							label="Regex de détection HRP"
							size="small"
							fullWidth
							value={local.stripOOC.regex ?? ""}
							onChange={(e) =>
								set("stripOOC", { ...local.stripOOC, regex: e.target.value || undefined })
							}
							helperText='Ex: \(\(.*\)\) — entoure les messages hors-jeu'
						/>
						<Box>
							<Typography variant="body2" gutterBottom>
								Délai avant suppression : {local.stripOOC.timer ? local.stripOOC.timer / 1000 : 0}s
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
							<InputLabel>Canaux/catégories surveillés</InputLabel>
							<Select
								multiple
								value={local.stripOOC.categoryId ?? []}
								label="Canaux/catégories surveillés"
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
							"Canal de renvoi HRP (optionnel)",
							local.stripOOC.forwardId,
							(v) => set("stripOOC", { ...local.stripOOC, forwardId: v || undefined }),
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
							label="Mode thread (ignorer le canal de renvoi)"
						/>
					</Box>
				)}
			</Paper>

			<Box className="flex justify-end">
				<Button
					type="submit"
					variant="contained"
					size="large"
					disabled={saving}
					sx={{ minWidth: 160 }}
				>
					{saving ? "Sauvegarde..." : "Sauvegarder"}
				</Button>
			</Box>
		</Box>
	);
}
