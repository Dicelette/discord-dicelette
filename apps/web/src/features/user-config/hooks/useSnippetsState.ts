import { userApi } from "@dicelette/api";
import { useI18n } from "@shared";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { SnippetsState } from "../types";

interface State {
	data: Record<string, string>;
	newName: string;
	newValue: string;
	saving: boolean;
	success: boolean;
	error: string | null;
	warning: string | null;
	entryErrors: Record<string, string>;
	adding: boolean;
	addError: string | null;
}

type Action =
	| { type: "add_entry"; name: string; value: string }
	| { type: "delete_entry"; key: string }
	| { type: "rename_entry"; oldName: string; newName: string }
	| { type: "update_entry_value"; name: string; value: string }
	| { type: "merge_data"; entries: Record<string, string> }
	| { type: "set_entry_errors"; errors: Record<string, string> }
	| { type: "set_new_name"; value: string }
	| { type: "set_new_value"; value: string }
	| { type: "set_add_error"; value: string | null }
	| { type: "set_error"; value: string | null }
	| { type: "set_warning"; value: string | null }
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
			const nextErrors = { ...state.entryErrors };
			delete nextErrors[action.key];
			return {
				...state,
				data: next,
				entryErrors: nextErrors,
				warning: null,
				success: false,
			};
		}
		case "rename_entry": {
			const entries = Object.entries(state.data);
			const idx = entries.findIndex(([k]) => k === action.oldName);
			if (idx === -1) return state;
			entries[idx] = [action.newName, entries[idx][1]];
			const {
				[action.oldName]: _a,
				[action.newName]: _b,
				...restErrors
			} = state.entryErrors;
			return {
				...state,
				data: Object.fromEntries(entries),
				entryErrors: restErrors,
				warning: null,
				success: false,
			};
		}
		case "update_entry_value": {
			const nextErrors = { ...state.entryErrors };
			delete nextErrors[action.name];
			return {
				...state,
				data: { ...state.data, [action.name]: action.value },
				entryErrors: nextErrors,
				warning: null,
				success: false,
			};
		}
		case "merge_data":
			return { ...state, data: { ...state.data, ...action.entries } };
		case "set_entry_errors":
			return { ...state, entryErrors: action.errors };
		case "set_new_name":
			return { ...state, newName: action.value };
		case "set_new_value":
			return { ...state, newValue: action.value };
		case "set_add_error":
			return { ...state, addError: action.value };
		case "set_error":
			return { ...state, error: action.value };
		case "set_warning":
			return { ...state, warning: action.value };
		case "set_success":
			return { ...state, success: action.value };
		case "set_saving":
			return { ...state, saving: action.value };
		case "set_adding":
			return { ...state, adding: action.value };
	}
}

/**
 * Encapsulates all snippet-related state and actions for the user-config form.
 *
 * @param attributes - current attribute map, used for snippet validation
 * @param replaceUnknownForValidation - normalized ignoreNotfound value from the attributes hook
 */
export function useSnippetsState(
	guildId: string,
	initialSnippets: Record<string, string>,
	attributes: Record<string, number>,
	replaceUnknownForValidation: string | undefined
): SnippetsState {
	const { t } = useI18n();
	const importRef = useRef<HTMLInputElement>(null);

	const [state, dispatch] = useReducer(reducer, {
		data: initialSnippets,
		newName: "",
		newValue: "",
		saving: false,
		success: false,
		error: null,
		warning: null,
		entryErrors: {},
		adding: false,
		addError: null,
	});

	useEffect(() => {
		if (!state.success) return;
		const id = setTimeout(() => dispatch({ type: "set_success", value: false }), 3000);
		return () => clearTimeout(id);
	}, [state.success]);

	const onAdd = useCallback(async () => {
		const name = state.newName.trim();
		const value = state.newValue.trim();
		if (!name || !value) return;
		if (Object.keys(state.data).some((k) => k.toLowerCase() === name.toLowerCase())) {
			dispatch({ type: "set_add_error", value: t("userConfig.alreadyExists", { name }) });
			return;
		}
		dispatch({ type: "set_adding", value: true });
		dispatch({ type: "set_add_error", value: null });
		try {
			const res = await userApi.validateEntries(
				guildId,
				"snippets",
				{ [name]: value },
				attributes,
				replaceUnknownForValidation
			);
			if (res.data.errors[name] !== undefined) {
				dispatch({
					type: "set_add_error",
					value: t("userConfig.addInvalidDice", { name }),
				});
				return;
			}
			dispatch({ type: "add_entry", name, value });
		} catch {
			dispatch({ type: "set_add_error", value: t("userConfig.saveError") });
		} finally {
			dispatch({ type: "set_adding", value: false });
		}
	}, [
		guildId,
		state.data,
		state.newName,
		state.newValue,
		attributes,
		replaceUnknownForValidation,
		t,
	]);

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

	const onValueChange = useCallback((name: string, value: string) => {
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
					const res = await userApi.validateEntries(
						guildId,
						"snippets",
						parsed,
						attributes,
						replaceUnknownForValidation
					);
					const { valid, errors } = res.data;
					dispatch({ type: "merge_data", entries: valid as Record<string, string> });
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
					}
				} catch {
					dispatch({ type: "set_error", value: t("userConfig.importError") });
				} finally {
					e.target.value = "";
				}
			};
			reader.readAsText(file);
		},
		[guildId, attributes, replaceUnknownForValidation, t]
	);

	const onSave = useCallback(async () => {
		dispatch({ type: "set_saving", value: true });
		dispatch({ type: "set_error", value: null });
		dispatch({ type: "set_warning", value: null });
		dispatch({ type: "set_success", value: false });
		try {
			const validation = await userApi.validateEntries(
				guildId,
				"snippets",
				state.data,
				attributes,
				replaceUnknownForValidation
			);
			const validSnippets = validation.data.valid as Record<string, string>;
			const rawErrors = validation.data.errors;
			dispatch({
				type: "set_entry_errors",
				errors: Object.fromEntries(
					Object.entries(rawErrors).map(([name, invalidValue]) => [
						name,
						t("userConfig.invalidSnippetHelper", {
							name,
							value: String(invalidValue),
						}),
					])
				),
			});

			const okCount = Object.keys(validSnippets).length;
			const errCount = Object.keys(rawErrors).length;
			if (okCount === 0 && errCount > 0) {
				dispatch({ type: "set_error", value: t("userConfig.saveNoValidSnippets") });
				return;
			}

			await userApi.updateUserConfig(guildId, { snippets: validSnippets });

			if (errCount > 0) {
				dispatch({
					type: "set_warning",
					value: t("userConfig.savePartial", { ok: okCount, err: errCount }),
				});
				return;
			}

			dispatch({ type: "set_success", value: true });
		} catch {
			dispatch({ type: "set_error", value: t("userConfig.saveError") });
		} finally {
			dispatch({ type: "set_saving", value: false });
		}
	}, [guildId, state.data, attributes, replaceUnknownForValidation, t]);

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
	const setWarning = useCallback(
		(v: string | null) => dispatch({ type: "set_warning", value: v }),
		[]
	);

	return useMemo<SnippetsState>(
		() => ({
			data: state.data,
			entryErrors: state.entryErrors,
			newName: state.newName,
			newValue: state.newValue,
			adding: state.adding,
			addError: state.addError,
			error: state.error,
			warning: state.warning,
			success: state.success,
			saving: state.saving,
			importRef,
			setNewName,
			setNewValue,
			setAddError,
			setError,
			setWarning,
			onRename,
			onValueChange,
			onDelete,
			onAdd,
			onSave,
			onImportChange,
		}),
		// Stable setters (empty-dep useCallback) omitted — they never change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			state,
			onRename,
			onAdd,
			onSave,
			onImportChange,
			setWarning,
			setNewName,
			onValueChange,
			setNewValue,
			setError,
			setAddError,
			onDelete,
		]
	);
}
