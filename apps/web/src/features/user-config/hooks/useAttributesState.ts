import { userApi } from "@dicelette/api";
import { useI18n } from "@shared";
import { useCallback, useMemo, useState } from "react";
import type { AttributesState } from "../types";
import { useEditableEntriesState } from "./useEditableEntriesState";
import { useValidatedEntryActions } from "./useValidatedEntryActions";

export interface AttributesStateWithExtras extends AttributesState {
	normalizedReplaceUnknown: string;
	replaceUnknownForValidation: string | undefined;
}

/**
 * Encapsulates all attribute-related state and actions for the user-config form.
 * Also exposes derived values needed by the snippets hook.
 */
export function useAttributesState(
	guildId: string,
	initialAttributes: Record<string, number | string>,
	initialReplaceUnknown: string
): AttributesStateWithExtras {
	const { t } = useI18n();
	const entries = useEditableEntriesState<number | string>(initialAttributes);
	const [replaceUnknown, setReplaceUnknownState] = useState(initialReplaceUnknown);

	const normalizedReplaceUnknown = replaceUnknown.trim();
	const replaceUnknownForValidation = normalizedReplaceUnknown || undefined;

	const validateAttributes = useCallback(
		async (nextEntries: Record<string, unknown>) => {
			const res = await userApi.validateEntries(guildId, "attributes", nextEntries);
			return {
				valid: res.data.valid as Record<string, number | string>,
				errors: res.data.errors as Record<string, unknown>,
			};
		},
		[guildId]
	);

	const { onAdd, onImportChange } = useValidatedEntryActions<number | string>({
		newName: entries.state.newName,
		newValue: entries.state.newValue,
		hasDuplicateName: entries.hasDuplicateName,
		validateEntries: validateAttributes,
		addEntry: entries.actions.addEntry,
		mergeData: entries.actions.mergeData,
		setAdding: entries.actions.setAdding,
		setAddError: entries.actions.setAddError,
		setError: entries.actions.setError,
		setSuccess: entries.actions.setSuccess,
		getDuplicateMessage: (name: string) => t("userConfig.alreadyExists", { name }),
		getInvalidAddMessage: (name: string, errors: Record<string, unknown>) => {
			if (errors[name] === undefined) return null;
			return errors[name] === "containsHyphen"
				? t("userConfig.attrHyphenError")
				: t("userConfig.addInvalidAttr", { name });
		},
		getAddRequestErrorMessage: () => t("userConfig.saveError"),
		getImportErrorMessage: () => t("userConfig.importError"),
		getImportPartialMessage: (ok: number, err: number) =>
			t("userConfig.importPartial", { ok, err }),
	});

	const onDelete = useCallback(
		(key: string) => {
			entries.actions.deleteEntry(key);
		},
		[entries.actions.deleteEntry]
	);

	const onRename = useCallback(
		(oldName: string, newName: string): string | null => {
			if (entries.hasDuplicateName(newName, oldName)) {
				return t("userConfig.alreadyExists", { name: newName });
			}
			entries.actions.renameEntry(oldName, newName);
			return null;
		},
		[entries.hasDuplicateName, entries.actions.renameEntry, t]
	);

	const onValueChange = useCallback(
		(name: string, value: string) => {
			entries.actions.updateEntryValue(name, value);
		},
		[entries.actions.updateEntryValue]
	);

	const onSave = useCallback(async () => {
		entries.actions.setSaving(true);
		entries.actions.setError(null);
		try {
			await userApi.updateUserConfig(guildId, {
				attributes: entries.state.data,
				ignoreNotfound: normalizedReplaceUnknown,
			});
			entries.actions.setSuccess(true);
		} catch {
			entries.actions.setError(t("userConfig.saveError"));
		} finally {
			entries.actions.setSaving(false);
		}
	}, [
		guildId,
		entries.state.data,
		normalizedReplaceUnknown,
		entries.actions.setSaving,
		entries.actions.setError,
		entries.actions.setSuccess,
		t,
	]);

	const setReplaceUnknown = useCallback((value: string) => {
		setReplaceUnknownState(value);
	}, []);

	return useMemo<AttributesStateWithExtras>(
		() => ({
			...entries.baseState,
			replaceUnknown,
			setReplaceUnknown,
			onRename,
			onValueChange,
			onDelete,
			onAdd,
			onSave,
			onImportChange,
			normalizedReplaceUnknown,
			replaceUnknownForValidation,
		}),
		[
			entries.baseState,
			replaceUnknown,
			setReplaceUnknown,
			onRename,
			onValueChange,
			onDelete,
			onAdd,
			onSave,
			onImportChange,
			normalizedReplaceUnknown,
			replaceUnknownForValidation,
		]
	);
}
