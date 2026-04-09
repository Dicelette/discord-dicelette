import type { TemplateResult } from "@dicelette/types";
import { useI18n } from "@shared";
import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useReducer,
} from "react";
import type { TemplateState } from "../types";
import { DEFAULT_TEMPLATE } from "../utils";

interface State {
	template: TemplateResult;
	saving: boolean;
	success: boolean;
	error: string | null;
}

type Action =
	| { type: "set_value"; value: TemplateResult }
	| { type: "update_value"; updater: (prev: TemplateResult) => TemplateResult }
	| { type: "saving"; value: boolean }
	| { type: "set_success"; value: boolean }
	| { type: "set_error"; value: string | null };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "set_value":
			return { ...state, template: action.value };
		case "update_value":
			return { ...state, template: action.updater(state.template) };
		case "saving":
			return { ...state, saving: action.value };
		case "set_success":
			return { ...state, success: action.value };
		case "set_error":
			return { ...state, error: action.value };
	}
}

/**
 * Encapsulates the template link state and save/reset logic.
 *
 * @param initialTemplate - initial template value (from config or user config)
 * @param saveFn - async function that persists the template
 * @param options.externalValue - when provided, syncs the template state when this value changes
 *   (useful for GuildConfigForm where config can be updated from outside)
 * @param options.errorKey - i18n key used when save fails (default: "userConfig.saveError")
 */
export function useTemplateState(
	initialTemplate: TemplateResult | null | undefined,
	saveFn: (template: TemplateResult) => Promise<unknown>,
	options: { externalValue?: TemplateResult | null; errorKey?: string } = {}
): TemplateState {
	const { externalValue, errorKey = "userConfig.saveError" } = options;
	const { t } = useI18n();

	const [state, dispatch] = useReducer(reducer, {
		template: initialTemplate ?? DEFAULT_TEMPLATE,
		saving: false,
		success: false,
		error: null,
	});

	// Sync from external source (e.g. when parent config is updated after save)
	useEffect(() => {
		if (externalValue !== undefined) {
			dispatch({ type: "set_value", value: externalValue ?? DEFAULT_TEMPLATE });
		}
	}, [externalValue]);

	useEffect(() => {
		if (!state.success) return;
		const id = setTimeout(() => dispatch({ type: "set_success", value: false }), 3000);
		return () => clearTimeout(id);
	}, [state.success]);

	const setValue = useCallback<Dispatch<SetStateAction<TemplateResult>>>((v) => {
		if (typeof v === "function") {
			dispatch({ type: "update_value", updater: v });
		} else {
			dispatch({ type: "set_value", value: v });
		}
	}, []);

	const setError = useCallback((value: string | null) => {
		dispatch({ type: "set_error", value });
	}, []);

	const onSave = useCallback(async () => {
		dispatch({ type: "saving", value: true });
		dispatch({ type: "set_error", value: null });
		try {
			await saveFn(state.template);
			dispatch({ type: "set_success", value: true });
		} catch {
			dispatch({ type: "set_error", value: t(errorKey) });
		} finally {
			dispatch({ type: "saving", value: false });
		}
	}, [saveFn, state.template, t, errorKey]);

	const onReset = useCallback(
		() => dispatch({ type: "set_value", value: DEFAULT_TEMPLATE }),
		[]
	);

	return useMemo<TemplateState>(
		() => ({
			value: state.template,
			setValue,
			saving: state.saving,
			success: state.success,
			error: state.error,
			setError,
			onSave,
			onReset,
		}),
		[
			state.template,
			setValue,
			state.saving,
			state.success,
			state.error,
			setError,
			onSave,
			onReset,
		]
	);
}
