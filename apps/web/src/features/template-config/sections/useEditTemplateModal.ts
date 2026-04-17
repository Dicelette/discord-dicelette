import {
	getEngine,
	type StatisticalTemplate,
	verifyTemplateValue,
} from "@dicelette/core";
import { useMediaQuery, useTheme } from "@mui/material";
import { type Channel, useI18n } from "@shared";
import type React from "react";
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
import type { TemplateTab } from "../../edit-template/TemplateForm";
import type { ImportTemplateData } from "../types";

// ─── state ─────────────────────────────────────────────────────────────────────

export interface ModalState {
	channelId: string;
	publicChannelId: string;
	privateChannelId: string;
	deleteCharacters: boolean;
	updateCharacters: boolean;
	saving: boolean;
	error: string | null;
}

export type ModalAction =
	| {
			type: "set_channel";
			key: "channelId" | "publicChannelId" | "privateChannelId";
			value: string;
	  }
	| { type: "set_delete_characters"; value: boolean }
	| { type: "set_update_characters"; value: boolean }
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
		case "set_update_characters":
			return { ...state, updateCharacters: action.value };
		case "set_saving":
			return { ...state, saving: action.value };
		case "set_error":
			return { ...state, error: action.value };
		case "reset":
			return {
				...state,
				...action.defaults,
				deleteCharacters: false,
				updateCharacters: false,
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

// ─── hook ──────────────────────────────────────────────────────────────────────

interface UseEditTemplateModalProps {
	open: boolean;
	onClose: () => void;
	onSave: (data: ImportTemplateData) => Promise<void>;
	channels: Channel[];
	existingTemplate?: StatisticalTemplate;
	defaultTemplateChannelId?: string;
	defaultPublicChannelId?: string;
	defaultPrivateChannelId?: string;
}

export function useEditTemplateModal({
	open,
	onClose,
	onSave,
	channels,
	existingTemplate,
	defaultTemplateChannelId,
	defaultPublicChannelId,
	defaultPrivateChannelId,
}: UseEditTemplateModalProps) {
	const { t } = useI18n();
	const theme = useTheme();
	const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
	const formId = useId();

	const [activeTab, setActiveTab] = useState<TemplateTab>("channels");
	useEffect(() => {
		if (open) setActiveTab("channels");
	}, [open]);

	// ── JSON import ────────────────────────────────────────────────────────────
	const [importedTemplate, setImportedTemplate] = useState<StatisticalTemplate | null>(
		null
	);
	const [importFile, setImportFile] = useState<File | null>(null);
	const [importError, setImportError] = useState<string | null>(null);
	const importFileRef = useRef<HTMLInputElement>(null);

	const handleImportFile = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0] ?? null;
			e.target.value = "";
			setImportFile(file);
			setImportError(null);
			if (!file) return;
			try {
				const json = JSON.parse(await file.text());
				const validated = verifyTemplateValue(json, true, getEngine("browserCrypto"));
				setImportedTemplate(validated);
			} catch {
				setImportError(t("template.importError"));
				setImportFile(null);
			}
		},
		[t]
	);

	const activeTemplate = importedTemplate ?? existingTemplate;

	// ── Deferred form mount ────────────────────────────────────────────────────
	const [formReady, setFormReady] = useState(false);
	const rafRef = useRef<number>(0);

	useEffect(() => {
		if (!open) {
			setFormReady(false);
			return;
		}
		rafRef.current = requestAnimationFrame(() => {
			startTransition(() => setFormReady(true));
		});
		return () => cancelAnimationFrame(rafRef.current);
	}, [open]);

	// ── Channel state ──────────────────────────────────────────────────────────
	const [state, dispatch] = useReducer(reducer, undefined, () => ({
		...makeDefaults(
			defaultTemplateChannelId,
			defaultPublicChannelId,
			defaultPrivateChannelId
		),
		deleteCharacters: false,
		updateCharacters: false,
		saving: false,
		error: null,
	}));

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

	// ── Handlers ──────────────────────────────────────────────────────────────
	const handleClose = useCallback(() => {
		setImportedTemplate(null);
		setImportFile(null);
		setImportError(null);
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
					updateCharacters: state.updateCharacters,
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
			state.updateCharacters,
		]
	);

	return {
		t,
		fullScreen,
		formId,
		activeTab,
		setActiveTab,
		importFile,
		importError,
		setImportError,
		importFileRef,
		handleImportFile,
		activeTemplate,
		formReady,
		state,
		dispatch,
		templateChannels,
		charChannels,
		handleClose,
		handleSave,
		isEditMode: !!existingTemplate,
	};
}
