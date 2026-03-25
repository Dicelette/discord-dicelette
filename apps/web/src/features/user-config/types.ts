import type { TemplateResult } from "@dicelette/types";
import type { Dispatch, RefObject, SetStateAction } from "react";

export interface SnippetsState {
	data: Record<string, string>;
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
	onRename: (oldName: string, newName: string) => void;
	onValueChange: (name: string, value: string) => void;
	onDelete: (name: string) => void;
	onAdd: () => void;
	onSave: () => void;
	onImportChange: (e: InputEvent & { target: HTMLInputElement }) => void;
}

export interface AttributesState {
	data: Record<string, number>;
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
	onRename: (oldName: string, newName: string) => void;
	onValueChange: (name: string, value: number) => void;
	onDelete: (name: string) => void;
	onAdd: () => void;
	onSave: () => void;
	onImportChange: (e: InputEvent & { target: HTMLInputElement }) => void;
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
	value: number;
	onRename: (oldName: string, newName: string) => void;
	onValueChange: (name: string, value: number) => void;
	onDelete: (name: string) => void;
}

export interface AttributeSectionProps {
	state: AttributesState;
}

export interface TemplateSectionProps {
	state: TemplateState;
}
