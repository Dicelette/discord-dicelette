import { useCallback, useMemo, useReducer, useRef } from "react";
import { hasCaseInsensitiveDuplicate, renameRecordKey, useAutoResetFlag } from "./utils";

interface EditableEntriesCoreState<TValue> {
	data: Record<string, TValue>;
	newName: string;
	newValue: string;
	saving: boolean;
	success: boolean;
	error: string | null;
	adding: boolean;
	addError: string | null;
}

type EditableEntriesAction<TValue> =
	| { type: "add_entry"; name: string; value: TValue }
	| { type: "delete_entry"; key: string }
	| { type: "rename_entry"; oldName: string; newName: string }
	| { type: "update_entry_value"; name: string; value: TValue }
	| { type: "merge_data"; entries: Record<string, TValue> }
	| { type: "set_new_name"; value: string }
	| { type: "set_new_value"; value: string }
	| { type: "set_add_error"; value: string | null }
	| { type: "set_error"; value: string | null }
	| { type: "set_success"; value: boolean }
	| { type: "set_saving"; value: boolean }
	| { type: "set_adding"; value: boolean };

function reducer<TValue>(
	state: EditableEntriesCoreState<TValue>,
	action: EditableEntriesAction<TValue>
): EditableEntriesCoreState<TValue> {
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
			const renamed = renameRecordKey(state.data, action.oldName, action.newName);
			if (!renamed) return state;
			return { ...state, data: renamed };
		}
		case "update_entry_value":
			return { ...state, data: { ...state.data, [action.name]: action.value } };
		case "merge_data":
			return { ...state, data: { ...state.data, ...action.entries } };
		case "set_new_name":
			return { ...state, newName: action.value };
		case "set_new_value":
			return { ...state, newValue: action.value };
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

export function useEditableEntriesState<TValue>(initialData: Record<string, TValue>) {
	const importRef = useRef<HTMLInputElement>(null);
	const [state, dispatch] = useReducer(reducer<TValue>, {
		data: initialData,
		newName: "",
		newValue: "",
		saving: false,
		success: false,
		error: null,
		adding: false,
		addError: null,
	});

	useAutoResetFlag(
		state.success,
		() => dispatch({ type: "set_success", value: false }),
		3000
	);

	const hasDuplicateName = useCallback(
		(name: string, excludeName?: string) =>
			hasCaseInsensitiveDuplicate(state.data, name, excludeName),
		[state.data]
	);

	const addEntry = useCallback((name: string, value: TValue) => {
		dispatch({ type: "add_entry", name, value });
	}, []);
	const deleteEntry = useCallback((key: string) => {
		dispatch({ type: "delete_entry", key });
	}, []);
	const renameEntry = useCallback(
		(oldName: string, newName: string): boolean => {
			if (!(oldName in state.data)) return false;
			dispatch({ type: "rename_entry", oldName, newName });
			return true;
		},
		[state.data]
	);
	const updateEntryValue = useCallback((name: string, value: TValue) => {
		dispatch({ type: "update_entry_value", name, value });
	}, []);
	const mergeData = useCallback((entries: Record<string, TValue>) => {
		dispatch({ type: "merge_data", entries });
	}, []);
	const setNewName = useCallback((value: string) => {
		dispatch({ type: "set_new_name", value });
	}, []);
	const setNewValue = useCallback((value: string) => {
		dispatch({ type: "set_new_value", value });
	}, []);
	const setAddError = useCallback((value: string | null) => {
		dispatch({ type: "set_add_error", value });
	}, []);
	const setError = useCallback((value: string | null) => {
		dispatch({ type: "set_error", value });
	}, []);
	const setSuccess = useCallback((value: boolean) => {
		dispatch({ type: "set_success", value });
	}, []);
	const setSaving = useCallback((value: boolean) => {
		dispatch({ type: "set_saving", value });
	}, []);
	const setAdding = useCallback((value: boolean) => {
		dispatch({ type: "set_adding", value });
	}, []);

	const actions = useMemo(
		() => ({
			addEntry,
			deleteEntry,
			renameEntry,
			updateEntryValue,
			mergeData,
			setNewName,
			setNewValue,
			setAddError,
			setError,
			setSuccess,
			setSaving,
			setAdding,
		}),
		[
			addEntry,
			deleteEntry,
			renameEntry,
			updateEntryValue,
			mergeData,
			setNewName,
			setNewValue,
			setAddError,
			setError,
			setSuccess,
			setSaving,
			setAdding,
		]
	);

	const baseState = useMemo(
		() => ({
			data: state.data,
			newName: state.newName,
			newValue: state.newValue,
			adding: state.adding,
			addError: state.addError,
			error: state.error,
			success: state.success,
			saving: state.saving,
			importRef,
			setNewName,
			setNewValue,
			setAddError,
			setError,
		}),
		[state, setAddError, setError, setNewName, setNewValue]
	);

	return {
		state,
		importRef,
		hasDuplicateName,
		actions,
		baseState,
	};
}
