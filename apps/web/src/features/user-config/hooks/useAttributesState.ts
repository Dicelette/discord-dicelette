import { userApi } from "@dicelette/api";
import { useI18n } from "@shared";
import { useCallback, useMemo, useReducer, useRef } from "react";
import type { AttributesState } from "../types";

export interface AttributesStateWithExtras extends AttributesState {
	/** `replaceUnknown` trimmed — ready to be passed to the API */
	normalizedReplaceUnknown: string;
	/** `normalizedReplaceUnknown || undefined` — used by snippet validation */
	replaceUnknownForValidation: string | undefined;
}

interface State {
	data: Record<string, number>;
	replaceUnknown: string;
	newName: string;
	newValue: string;
	saving: boolean;
	success: boolean;
	error: string | null;
	adding: boolean;
	addError: string | null;
}

type Action =
	| { type: "add_entry"; name: string; value: number }
	| { type: "delete_entry"; key: string }
	| { type: "rename_entry"; oldName: string; newName: string }
	| { type: "update_entry_value"; name: string; value: number }
	| { type: "merge_data"; entries: Record<string, number> }
	| { type: "set_new_name"; value: string }
	| { type: "set_new_value"; value: string }
	| { type: "set_replace_unknown"; value: string }
	| { type: "set_add_error"; value: string | null }
	| { type: "set_error"; value: string | null }
	| { type: "set_success"; value: boolean }
	| { type: "set_saving"; value: boolean }
	| { type: "set_adding"; value: boolean };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "add_entry":
			return {
				...state,
				data: { ...state.data, [action.name]: action.value },
				newName: "",
				newValue: "",
			};
		case "delete_entry": {
			const next = { ...state.data };
			delete next[action.key];
			return { ...state, data: next };
		}
		case "rename_entry": {
			const entries = Object.entries(state.data);
			const idx = entries.findIndex(([k]) => k === action.oldName);
			if (idx === -1) return state;
			entries[idx] = [action.newName, entries[idx][1]];
			return { ...state, data: Object.fromEntries(entries) };
		}
		case "update_entry_value":
			return { ...state, data: { ...state.data, [action.name]: action.value } };
		case "merge_data":
			return { ...state, data: { ...state.data, ...action.entries } };
		case "set_new_name":
			return { ...state, newName: action.value };
		case "set_new_value":
			return { ...state, newValue: action.value };
		case "set_replace_unknown":
			return { ...state, replaceUnknown: action.value };
		case "set_add_error":
			return { ...state, addError: action.value };
		case "set_error":
			return { ...state, error: action.value };
		case "set_success":
			return { ...state, success: action.value };
		case "set_saving":
			return { ...state, saving: action.value };
		case "set_adding":
			return { ...state, adding: action.value };
	}
}

/**
 * Encapsulates all attribute-related state and actions for the user-config form.
 * Also exposes derived values needed by the snippets hook.
 */
export function useAttributesState(
	guildId: string,
	initialAttributes: Record<string, number>,
	initialReplaceUnknown: string
): AttributesStateWithExtras {
	const { t } = useI18n();
	const importRef = useRef<HTMLInputElement>(null);

	const [state, dispatch] = useReducer(reducer, {
		data: initialAttributes,
		replaceUnknown: initialReplaceUnknown,
		newName: "",
		newValue: "",
		saving: false,
		success: false,
		error: null,
		adding: false,
		addError: null,
	});

	const normalizedReplaceUnknown = state.replaceUnknown.trim();
	const replaceUnknownForValidation = normalizedReplaceUnknown || undefined;

	const onAdd = useCallback(async () => {
		const name = state.newName.trim();
		const val = Number.parseFloat(state.newValue);
		if (!name || Number.isNaN(val)) return;
		if (Object.keys(state.data).some((k) => k.toLowerCase() === name.toLowerCase())) {
			dispatch({ type: "set_add_error", value: t("userConfig.alreadyExists", { name }) });
			return;
		}
		dispatch({ type: "set_adding", value: true });
		dispatch({ type: "set_add_error", value: null });
		try {
			const res = await userApi.validateEntries(guildId, "attributes", { [name]: val });
			if (res.data.errors[name] !== undefined) {
				const msg =
					res.data.errors[name] === "containsHyphen"
						? t("userConfig.attrHyphenError")
						: t("userConfig.addInvalidAttr", { name });
				dispatch({ type: "set_add_error", value: msg });
				return;
			}
			dispatch({ type: "add_entry", name, value: val });
		} catch {
			dispatch({ type: "set_add_error", value: t("userConfig.saveError") });
		} finally {
			dispatch({ type: "set_adding", value: false });
		}
	}, [guildId, state.data, state.newName, state.newValue, t]);

	const onDelete = useCallback((key: string) => {
		dispatch({ type: "delete_entry", key });
	}, []);

	const onRename = useCallback(
		(oldName: string, newName: string): string | null => {
			if (
				Object.keys(state.data).some(
					(k) => k !== oldName && k.toLowerCase() === newName.toLowerCase()
				)
			) {
				return t("userConfig.alreadyExists", { name: newName });
			}
			dispatch({ type: "rename_entry", oldName, newName });
			return null;
		},
		[state.data, t]
	);

	const onValueChange = useCallback((name: string, value: number) => {
		dispatch({ type: "update_entry_value", name, value });
	}, []);

	const onImportChange = useCallback(
		(e: InputEvent & { target: HTMLInputElement }) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = async () => {
				try {
					const parsed = JSON.parse(reader.result as string);
					if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
						dispatch({ type: "set_error", value: t("userConfig.importError") });
						return;
					}
					const res = await userApi.validateEntries(guildId, "attributes", parsed);
					const { valid, errors } = res.data;
					dispatch({ type: "merge_data", entries: valid as Record<string, number> });
					const errCount = Object.keys(errors).length;
					const okCount = Object.keys(valid).length;
					if (errCount > 0) {
						dispatch({
							type: "set_error",
							value: t("userConfig.importPartial", { ok: okCount, err: errCount }),
						});
					} else if (okCount > 0) {
						dispatch({ type: "set_error", value: null });
						dispatch({ type: "set_success", value: true });
						setTimeout(() => dispatch({ type: "set_success", value: false }), 3000);
					}
				} catch {
					dispatch({ type: "set_error", value: t("userConfig.importError") });
				} finally {
					e.target.value = "";
				}
			};
			reader.readAsText(file);
		},
		[guildId, t]
	);

	const onSave = useCallback(async () => {
		dispatch({ type: "set_saving", value: true });
		dispatch({ type: "set_error", value: null });
		try {
			await userApi.updateUserConfig(guildId, {
				attributes: state.data,
				ignoreNotfound: normalizedReplaceUnknown,
			});
			dispatch({ type: "set_success", value: true });
			setTimeout(() => dispatch({ type: "set_success", value: false }), 3000);
		} catch {
			dispatch({ type: "set_error", value: t("userConfig.saveError") });
		} finally {
			dispatch({ type: "set_saving", value: false });
		}
	}, [guildId, state.data, normalizedReplaceUnknown, t]);

	const setReplaceUnknown = useCallback(
		(v: string) => dispatch({ type: "set_replace_unknown", value: v }),
		[]
	);
	const setNewName = useCallback(
		(v: string) => dispatch({ type: "set_new_name", value: v }),
		[]
	);
	const setNewValue = useCallback(
		(v: string) => dispatch({ type: "set_new_value", value: v }),
		[]
	);
	const setAddError = useCallback(
		(v: string | null) => dispatch({ type: "set_add_error", value: v }),
		[]
	);
	const setError = useCallback(
		(v: string | null) => dispatch({ type: "set_error", value: v }),
		[]
	);

	const attributesState = useMemo<AttributesState>(
		() => ({
			data: state.data,
			replaceUnknown: state.replaceUnknown,
			newName: state.newName,
			newValue: state.newValue,
			adding: state.adding,
			addError: state.addError,
			error: state.error,
			success: state.success,
			saving: state.saving,
			importRef,
			setReplaceUnknown,
			setNewName,
			setNewValue,
			setAddError,
			setError,
			onRename,
			onValueChange,
			onDelete,
			onAdd,
			onSave,
			onImportChange,
		}),
		[
			state.data,
			state.replaceUnknown,
			state.newName,
			state.newValue,
			state.adding,
			state.addError,
			state.error,
			state.success,
			state.saving,
			setReplaceUnknown,
			setNewName,
			setNewValue,
			setAddError,
			setError,
			onRename,
			onValueChange,
			onDelete,
			onAdd,
			onSave,
			onImportChange,
		]
	);

	return { ...attributesState, normalizedReplaceUnknown, replaceUnknownForValidation };
}
