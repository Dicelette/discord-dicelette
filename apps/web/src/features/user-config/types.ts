import type { TemplateResult } from "@dicelette/types";
import type { Dispatch, RefObject, SetStateAction } from "react";

export interface EditableEntriesState<TValue> {
	data: Record<string, TValue>;
	newName: string;
	newValue: string;
	adding: boolean;
	addError: string | null;
	error: string | null;
	success: boolean;
	saving: boolean;
	importRef: RefObject<HTMLInputElement | null>;
	setNewName: (v: string) => void;
	setNewValue: (v: string) => void;
	setAddError: (v: string | null) => void;
	setError: (v: string | null) => void;
	onRename: (oldName: string, newName: string) => string | null;
	onValueChange: (name: string, value: string) => void;
	onDelete: (name: string) => void;
	onAdd: () => void;
	onSave: () => void;
	onImportChange: (e: InputEvent & { target: HTMLInputElement }) => void;
}

export interface SnippetsState extends EditableEntriesState<string> {
	entryErrors: Record<string, string>;
	warning: string | null;
	setWarning: (v: string | null) => void;
}

export interface AttributesState extends EditableEntriesState<number | string> {
	replaceUnknown: string;
	setReplaceUnknown: (v: string) => void;
}

export interface TemplateState {
	value: TemplateResult;
	setValue: Dispatch<SetStateAction<TemplateResult>>;
	saving: boolean;
	success: boolean;
	error: string | null;
	setError: (v: string | null) => void;
	onSave: () => void;
	onReset: () => void;
}

export interface AttributeRowProps {
	name: string;
	value: number | string;
	allData: Record<string, number | string>;
	onRename: (oldName: string, newName: string) => string | null;
	onValueChange: (name: string, value: string) => void;
	onDelete: (name: string) => void;
}

export interface AttributeSectionProps {
	state: AttributesState;
}

export interface TemplateSectionProps {
	state: TemplateState;
	isTemplate?: boolean;
}
