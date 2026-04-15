import { userApi } from "@dicelette/api";
import { useI18n } from "@shared";
import { useCallback, useMemo, useState } from "react";
import type { SnippetsState } from "../types";
import { useEditableEntriesState } from "./useEditableEntriesState";
import { useValidatedEntryActions } from "./useValidatedEntryActions";

// Encapsulates all snippet-related state and actions for the user-config form.
export function useSnippetsState(
	guildId: string,
	initialSnippets: Record<string, string>,
	attributes: Record<string, number | string>,
	replaceUnknownForValidation: string | undefined
): SnippetsState {
	const { t } = useI18n();
	const entries = useEditableEntriesState<string>(initialSnippets);
	const [warning, setWarningState] = useState<string | null>(null);
	const [entryErrors, setEntryErrors] = useState<Record<string, string>>({});

	const validateSnippets = useCallback(
		async (nextEntries: Record<string, unknown>) => {
			const res = await userApi.validateEntries(
				guildId,
				"snippets",
				nextEntries,
				attributes,
				replaceUnknownForValidation
			);
			return {
				valid: res.data.valid as Record<string, string>,
				errors: res.data.errors as Record<string, unknown>,
			};
		},
		[guildId, attributes, replaceUnknownForValidation]
	);

	const { onAdd, onImportChange } = useValidatedEntryActions<string>({
		newName: entries.state.newName,
		newValue: entries.state.newValue,
		hasDuplicateName: entries.hasDuplicateName,
		validateEntries: validateSnippets,
		addEntry: entries.actions.addEntry,
		mergeData: entries.actions.mergeData,
		setAdding: entries.actions.setAdding,
		setAddError: entries.actions.setAddError,
		setError: entries.actions.setError,
		setSuccess: entries.actions.setSuccess,
		getDuplicateMessage: (name: string) => t("userConfig.alreadyExists", { name }),
		getInvalidAddMessage: (name: string, errors: Record<string, unknown>) =>
			errors[name] === undefined ? null : t("userConfig.addInvalidDice", { name }),
		getAddRequestErrorMessage: () => t("userConfig.saveError"),
		getImportErrorMessage: () => t("userConfig.importError"),
		getImportPartialMessage: (ok: number, err: number) =>
			t("userConfig.importPartial", { ok, err }),
	});

	const clearEntryError = useCallback((name: string) => {
		setEntryErrors((current) => {
			if (current[name] === undefined) return current;
			const next = { ...current };
			delete next[name];
			return next;
		});
	}, []);

	const clearRenameErrors = useCallback((oldName: string, newName: string) => {
		setEntryErrors((current) => {
			if (current[oldName] === undefined && current[newName] === undefined)
				return current;
			const { [oldName]: _oldError, [newName]: _newError, ...rest } = current;
			return rest;
		});
	}, []);

	const onDelete = useCallback(
		(key: string) => {
			clearEntryError(key);
			setWarningState(null);
			entries.actions.setSuccess(false);
			entries.actions.deleteEntry(key);
		},
		[clearEntryError, entries.actions.deleteEntry, entries.actions.setSuccess]
	);

	const onRename = useCallback(
		(oldName: string, newName: string): string | null => {
			if (entries.hasDuplicateName(newName, oldName)) {
				return t("userConfig.alreadyExists", { name: newName });
			}
			clearRenameErrors(oldName, newName);
			setWarningState(null);
			entries.actions.setSuccess(false);
			entries.actions.renameEntry(oldName, newName);
			return null;
		},
		[
			entries.hasDuplicateName,
			clearRenameErrors,
			entries.actions.setSuccess,
			entries.actions.renameEntry,
			t,
		]
	);

	const onValueChange = useCallback(
		(name: string, value: string) => {
			clearEntryError(name);
			setWarningState(null);
			entries.actions.setSuccess(false);
			entries.actions.updateEntryValue(name, value);
		},
		[clearEntryError, entries.actions.setSuccess, entries.actions.updateEntryValue]
	);

	const onSave = useCallback(async () => {
		entries.actions.setSaving(true);
		entries.actions.setError(null);
		setWarningState(null);
		entries.actions.setSuccess(false);
		try {
			const validation = await validateSnippets(entries.state.data);
			const validSnippets = validation.valid;
			const rawErrors = validation.errors;
			setEntryErrors(
				Object.fromEntries(
					Object.entries(rawErrors).map(([name, invalidValue]) => [
						name,
						t("userConfig.invalidSnippetHelper", {
							name,
							value: String(invalidValue),
						}),
					])
				)
			);

			const okCount = Object.keys(validSnippets).length;
			const errCount = Object.keys(rawErrors).length;
			if (okCount === 0 && errCount > 0) {
				entries.actions.setError(t("userConfig.saveNoValidSnippets"));
				return;
			}

			await userApi.updateUserConfig(guildId, { snippets: validSnippets });

			if (errCount > 0) {
				setWarningState(t("userConfig.savePartial", { ok: okCount, err: errCount }));
				return;
			}

			entries.actions.setSuccess(true);
		} catch {
			entries.actions.setError(t("userConfig.saveError"));
		} finally {
			entries.actions.setSaving(false);
		}
	}, [
		validateSnippets,
		entries.state.data,
		entries.actions.setSaving,
		entries.actions.setError,
		entries.actions.setSuccess,
		guildId,
		t,
	]);

	const setWarning = useCallback((value: string | null) => {
		setWarningState(value);
	}, []);

	return useMemo<SnippetsState>(
		() => ({
			...entries.baseState,
			entryErrors,
			warning,
			setWarning,
			onRename,
			onValueChange,
			onDelete,
			onAdd,
			onSave,
			onImportChange,
		}),
		[
			entries.baseState,
			entryErrors,
			warning,
			setWarning,
			onRename,
			onValueChange,
			onDelete,
			onAdd,
			onSave,
			onImportChange,
		]
	);
}
