import { useCallback } from "react";
import { readJsonObjectFile } from "./utils";

interface ValidationResult<TValue> {
	valid: Record<string, TValue>;
	errors: Record<string, unknown>;
}

interface UseValidatedEntryActionsParams<TValue> {
	newName: string;
	newValue: string;
	hasDuplicateName: (name: string, excludeName?: string) => boolean;
	validateEntries: (
		entries: Record<string, unknown>
	) => Promise<ValidationResult<TValue>>;
	addEntry: (name: string, value: TValue) => void;
	mergeData: (entries: Record<string, TValue>) => void;
	setAdding: (value: boolean) => void;
	setAddError: (value: string | null) => void;
	setError: (value: string | null) => void;
	setSuccess: (value: boolean) => void;
	getDuplicateMessage: (name: string) => string;
	getInvalidAddMessage: (name: string, errors: Record<string, unknown>) => string | null;
	getAddRequestErrorMessage: () => string;
	getImportErrorMessage: () => string;
	getImportPartialMessage: (okCount: number, errCount: number) => string;
}

export function useValidatedEntryActions<TValue>({
	newName,
	newValue,
	hasDuplicateName,
	validateEntries,
	addEntry,
	mergeData,
	setAdding,
	setAddError,
	setError,
	setSuccess,
	getDuplicateMessage,
	getInvalidAddMessage,
	getAddRequestErrorMessage,
	getImportErrorMessage,
	getImportPartialMessage,
}: UseValidatedEntryActionsParams<TValue>) {
	const onAdd = useCallback(async () => {
		const trimmedName = newName.trim();
		const trimmedValue = newValue.trim();
		if (!trimmedName || !trimmedValue) return;
		if (hasDuplicateName(trimmedName)) {
			setAddError(getDuplicateMessage(trimmedName));
			return;
		}

		setAdding(true);
		setAddError(null);
		try {
			const result = await validateEntries({ [trimmedName]: trimmedValue });
			const addErrorMessage = getInvalidAddMessage(trimmedName, result.errors);
			if (addErrorMessage) {
				setAddError(addErrorMessage);
				return;
			}

			const validatedValue = result.valid[trimmedName];
			if (validatedValue === undefined) return;
			addEntry(trimmedName, validatedValue);
		} catch {
			setAddError(getAddRequestErrorMessage());
		} finally {
			setAdding(false);
		}
	}, [
		newName,
		newValue,
		hasDuplicateName,
		setAddError,
		getDuplicateMessage,
		setAdding,
		validateEntries,
		getInvalidAddMessage,
		addEntry,
		getAddRequestErrorMessage,
	]);

	const onImportChange = useCallback(
		async (e: InputEvent & { target: HTMLInputElement }) => {
			const file = e.target.files?.[0];
			if (!file) return;

			try {
				const parsed = await readJsonObjectFile(file);
				const result = await validateEntries(parsed);
				mergeData(result.valid);

				const errCount = Object.keys(result.errors).length;
				const okCount = Object.keys(result.valid).length;
				if (errCount > 0) {
					setError(getImportPartialMessage(okCount, errCount));
				} else if (okCount > 0) {
					setError(null);
					setSuccess(true);
				}
			} catch {
				setError(getImportErrorMessage());
			} finally {
				e.target.value = "";
			}
		},
		[
			validateEntries,
			mergeData,
			setError,
			getImportPartialMessage,
			setSuccess,
			getImportErrorMessage,
		]
	);

	return { onAdd, onImportChange };
}
