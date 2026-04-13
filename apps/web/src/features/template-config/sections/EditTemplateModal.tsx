import type { StatisticalTemplate } from "@dicelette/core";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControlLabel,
	Stack,
	Switch,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { type Channel, ChannelSelect, useI18n } from "@shared";
import {
	startTransition,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import TemplateForm from "../../edit-template/TemplateForm";
import type { ImportTemplateData } from "../types";

const captionIndentSx = { mt: 0.5, pl: 0.5 } as const;
const loadingBoxSx = { display: "flex", justifyContent: "center", py: 8 } as const;

// ─── local state ───────────────────────────────────────────────────────────────

interface ModalState {
	channelId: string;
	publicChannelId: string;
	privateChannelId: string;
	deleteCharacters: boolean;
	saving: boolean;
	error: string | null;
}

type ModalAction =
	| {
			type: "set_channel";
			key: "channelId" | "publicChannelId" | "privateChannelId";
			value: string;
	  }
	| { type: "set_delete_characters"; value: boolean }
	| { type: "set_saving"; value: boolean }
	| { type: "set_error"; value: string | null }
	| {
			type: "reset";
			defaults: Pick<ModalState, "channelId" | "publicChannelId" | "privateChannelId">;
	  };

function reducer(state: ModalState, action: ModalAction): ModalState {
	switch (action.type) {
		case "set_channel":
			return { ...state, [action.key]: action.value };
		case "set_delete_characters":
			return { ...state, deleteCharacters: action.value };
		case "set_saving":
			return { ...state, saving: action.value };
		case "set_error":
			return { ...state, error: action.value };
		case "reset":
			return {
				...state,
				...action.defaults,
				deleteCharacters: false,
				saving: false,
				error: null,
			};
	}
}

function makeDefaults(
	templateChannelId?: string,
	publicChannelId?: string,
	privateChannelId?: string
): Pick<ModalState, "channelId" | "publicChannelId" | "privateChannelId"> {
	return {
		channelId: templateChannelId ?? "",
		publicChannelId: publicChannelId ?? "",
		privateChannelId: privateChannelId ?? "",
	};
}

// ─── component ─────────────────────────────────────────────────────────────────

interface Props {
	open: boolean;
	onClose: () => void;
	onSave: (data: ImportTemplateData) => Promise<void>;
	channels: Channel[];
	hasCharacters: boolean;
	/** If provided, pre-populates the form (edit mode). */
	existingTemplate?: StatisticalTemplate;
	defaultTemplateChannelId?: string;
	defaultPublicChannelId?: string;
	defaultPrivateChannelId?: string;
}

export default function EditTemplateModal({
	open,
	onClose,
	onSave,
	channels,
	hasCharacters,
	existingTemplate,
	defaultTemplateChannelId,
	defaultPublicChannelId,
	defaultPrivateChannelId,
}: Props) {
	const { t } = useI18n();
	const theme = useTheme();
	const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
	const formId = useId();

	// Defer TemplateForm mounting so the dialog animation plays first.
	// The form is heavy (dnd, many hooks) — showing a spinner avoids UI freeze.
	const [formReady, setFormReady] = useState(false);
	const rafRef = useRef<number>(0);

	useEffect(() => {
		if (!open) {
			setFormReady(false);
			return;
		}
		// One rAF lets the Dialog start its CSS transition, then startTransition
		// marks the form mount as non-urgent so React can yield to the animation.
		rafRef.current = requestAnimationFrame(() => {
			startTransition(() => setFormReady(true));
		});
		return () => cancelAnimationFrame(rafRef.current);
	}, [open]);

	const [state, dispatch] = useReducer(reducer, undefined, () => ({
		...makeDefaults(
			defaultTemplateChannelId,
			defaultPublicChannelId,
			defaultPrivateChannelId
		),
		deleteCharacters: false,
		saving: false,
		error: null,
	}));

	// Sync channel defaults when parent config changes
	useEffect(() => {
		dispatch({
			type: "reset",
			defaults: makeDefaults(
				defaultTemplateChannelId,
				defaultPublicChannelId,
				defaultPrivateChannelId
			),
		});
	}, [defaultTemplateChannelId, defaultPublicChannelId, defaultPrivateChannelId]);

	const templateChannels = useMemo(
		() => channels.filter((c) => c.type === 0),
		[channels]
	);
	const charChannels = useMemo(
		() => channels.filter((c) => c.type === 0 || c.type === 15),
		[channels]
	);

	const handleClose = useCallback(() => {
		dispatch({
			type: "reset",
			defaults: makeDefaults(
				defaultTemplateChannelId,
				defaultPublicChannelId,
				defaultPrivateChannelId
			),
		});
		onClose();
	}, [
		onClose,
		defaultTemplateChannelId,
		defaultPublicChannelId,
		defaultPrivateChannelId,
	]);

	const handleSave = useCallback(
		async (template: StatisticalTemplate) => {
			if (!state.channelId) {
				dispatch({ type: "set_error", value: t("template.channelRequired") });
				return;
			}
			dispatch({ type: "set_saving", value: true });
			try {
				await onSave({
					template,
					channelId: state.channelId,
					publicChannelId: state.publicChannelId || undefined,
					privateChannelId: state.privateChannelId || undefined,
					deleteCharacters: state.deleteCharacters,
				});
				handleClose();
			} catch {
				dispatch({ type: "set_error", value: t("template.importError") });
			} finally {
				dispatch({ type: "set_saving", value: false });
			}
		},
		[
			onSave,
			handleClose,
			t,
			state.channelId,
			state.publicChannelId,
			state.privateChannelId,
			state.deleteCharacters,
		]
	);

	const isEditMode = !!existingTemplate;

	return (
		<Dialog
			open={open}
			onClose={handleClose}
			fullScreen={fullScreen}
			maxWidth="lg"
			fullWidth
			scroll="paper"
		>
			<DialogTitle>
				{isEditMode ? t("template.editModalTitle") : t("template.createModalTitle")}
			</DialogTitle>

			<DialogContent dividers sx={{ bgcolor: "background.paper" }}>
				<Stack spacing={2}>
					{state.error && (
						<Alert
							severity="error"
							onClose={() => dispatch({ type: "set_error", value: null })}
						>
							{state.error}
						</Alert>
					)}

					{/* Channel selection */}
					<Stack spacing={1.5}>
						<Box>
							<ChannelSelect
								label={`${t("template.templateChannel")} *`}
								value={state.channelId || undefined}
								channels={templateChannels}
								allChannels={channels}
								onChange={(value) => {
									dispatch({ type: "set_channel", key: "channelId", value });
									dispatch({ type: "set_error", value: null });
								}}
							/>
							<Typography variant="caption" color="text.secondary" sx={captionIndentSx}>
								{t("template.templateChannelHelp")}
							</Typography>
						</Box>

						<Box>
							<ChannelSelect
								label={t("config.defaultSheet")}
								value={state.publicChannelId || undefined}
								channels={charChannels}
								allChannels={channels}
								onChange={(value) =>
									dispatch({ type: "set_channel", key: "publicChannelId", value })
								}
							/>
							<Typography variant="caption" color="text.secondary" sx={captionIndentSx}>
								{t("template.publicChannelHelp")}
							</Typography>
						</Box>

						<Box>
							<ChannelSelect
								label={t("config.fields.privateChannel")}
								value={state.privateChannelId || undefined}
								channels={charChannels}
								allChannels={channels}
								onChange={(value) =>
									dispatch({ type: "set_channel", key: "privateChannelId", value })
								}
							/>
							<Typography variant="caption" color="text.secondary" sx={captionIndentSx}>
								{t("template.privateChannelHelp")}
							</Typography>
						</Box>
					</Stack>

					{hasCharacters && (
						<>
							<Divider />
							<Alert severity="warning">{t("template.deleteWarning")}</Alert>
							<FormControlLabel
								control={
									<Switch
										checked={state.deleteCharacters}
										color="error"
										onChange={(e) =>
											dispatch({
												type: "set_delete_characters",
												value: e.target.checked,
											})
										}
									/>
								}
								label={
									<Box>
										<Typography
											variant="body2"
											color={state.deleteCharacters ? "error" : undefined}
										>
											{t("template.deleteCharacters")}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{t("template.deleteCharactersHelp")}
										</Typography>
									</Box>
								}
							/>
						</>
					)}

					<Divider />

					{formReady ? (
						<TemplateForm
							initialTemplate={existingTemplate}
							onSave={handleSave}
							onError={(msg) => dispatch({ type: "set_error", value: msg })}
							formId={formId}
						/>
					) : (
						<Box sx={loadingBoxSx}>
							<CircularProgress />
						</Box>
					)}
				</Stack>
			</DialogContent>

			<DialogActions sx={{ bgcolor: "background.paper" }}>
				<Button onClick={handleClose} disabled={state.saving}>
					{t("common.cancel")}
				</Button>
				<Button
					type="submit"
					form={formId}
					variant="contained"
					disabled={state.saving || !state.channelId || !formReady}
				>
					{state.saving ? t("common.saving") : t("common.save")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
