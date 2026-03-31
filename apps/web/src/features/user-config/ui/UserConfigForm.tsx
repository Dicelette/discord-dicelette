import { type ApiUserConfig, userApi } from "@dicelette/dashboard-api";
import Stack from "@mui/material/Stack";
import { useI18n } from "@shared";
import { useCallback, useMemo, useRef, useState } from "react";
import "uniformize";
import type { AttributesState, SnippetsState, TemplateState } from "../types";
import { DEFAULT_TEMPLATE } from "../utils";
import { Attributes, Links, Snippets } from "./sections";

interface Props {
	guildId: string;
	initialConfig: ApiUserConfig["userConfig"];
}

export default function UserConfigForm({ guildId, initialConfig }: Props) {
	const { t } = useI18n();

	const [snippets, setSnippets] = useState<Record<string, string>>(
		initialConfig?.snippets ?? {}
	);
	const [newSnippetName, setNewSnippetName] = useState("");
	const [newSnippetValue, setNewSnippetValue] = useState("");
	const [savingSnippets, setSavingSnippets] = useState(false);
	const [snippetSuccess, setSnippetSuccess] = useState(false);
	const [snippetError, setSnippetError] = useState<string | null>(null);
	const [addingSnippet, setAddingSnippet] = useState(false);
	const [snippetAddError, setSnippetAddError] = useState<string | null>(null);

	const [attributes, setAttributes] = useState<Record<string, number>>(
		initialConfig?.attributes ?? {}
	);
	const [newAttrName, setNewAttrName] = useState("");
	const [newAttrValue, setNewAttrValue] = useState("");
	const [savingAttrs, setSavingAttrs] = useState(false);
	const [attrSuccess, setAttrSuccess] = useState(false);
	const [attrError, setAttrError] = useState<string | null>(null);
	const [addingAttr, setAddingAttr] = useState(false);
	const [attrAddError, setAttrAddError] = useState<string | null>(null);

	const [template, setTemplate] = useState(
		initialConfig?.createLinkTemplate ?? DEFAULT_TEMPLATE
	);
	const [savingTemplate, setSavingTemplate] = useState(false);
	const [templateSuccess, setTemplateSuccess] = useState(false);
	const [templateError, setTemplateError] = useState<string | null>(null);

	const snippetImportRef = useRef<HTMLInputElement>(null);
	const attrImportRef = useRef<HTMLInputElement>(null);

	const addSnippet = useCallback(async () => {
		const name = newSnippetName.trim();
		const value = newSnippetValue.trim();
		if (!name || !value) return;
		setAddingSnippet(true);
		setSnippetAddError(null);
		try {
			const res = await userApi.validateEntries(
				guildId,
				"snippets",
				{ [name]: value },
				attributes
			);
			if (res.data.errors[name] !== undefined) {
				setSnippetAddError(t("userConfig.addInvalidDice", { name }));
				return;
			}
			setSnippets((prev) => ({ ...prev, [name]: value }));
			setNewSnippetName("");
			setNewSnippetValue("");
		} catch {
			setSnippetAddError(t("userConfig.saveError"));
		} finally {
			setAddingSnippet(false);
		}
	}, [guildId, newSnippetName, newSnippetValue, attributes, t]);

	const deleteSnippet = useCallback((key: string) => {
		setSnippets((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	const renameSnippet = useCallback((oldName: string, newName: string) => {
		setSnippets((prev) => {
			const entries = Object.entries(prev);
			const idx = entries.findIndex(([k]) => k === oldName);
			if (idx === -1) return prev;
			entries[idx] = [newName, entries[idx][1]];
			return Object.fromEntries(entries);
		});
	}, []);

	const updateSnippetValue = useCallback((name: string, value: string) => {
		setSnippets((prev) => ({ ...prev, [name]: value }));
	}, []);

	const importSnippets = useCallback(
		(e: InputEvent & { target: HTMLInputElement }) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = async () => {
				try {
					const parsed = JSON.parse(reader.result as string);
					if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
						setSnippetError(t("userConfig.importError"));
						return;
					}
					const res = await userApi.validateEntries(
						guildId,
						"snippets",
						parsed,
						attributes
					);
					const { valid, errors } = res.data;
					setSnippets((prev) => ({ ...prev, ...(valid as Record<string, string>) }));
					const errCount = Object.keys(errors).length;
					const okCount = Object.keys(valid).length;
					if (errCount > 0) {
						setSnippetError(
							t("userConfig.importPartial", { ok: okCount, err: errCount })
						);
					} else if (okCount > 0) {
						setSnippetError(null);
						setSnippetSuccess(true);
						setTimeout(() => setSnippetSuccess(false), 3000);
					}
				} catch {
					setSnippetError(t("userConfig.importError"));
				} finally {
					e.target.value = "";
				}
			};
			reader.readAsText(file);
		},
		[guildId, attributes, t]
	);

	const saveSnippets = useCallback(async () => {
		setSavingSnippets(true);
		setSnippetError(null);
		try {
			await userApi.updateUserConfig(guildId, { snippets });
			setSnippetSuccess(true);
			setTimeout(() => setSnippetSuccess(false), 3000);
		} catch {
			setSnippetError(t("userConfig.saveError"));
		} finally {
			setSavingSnippets(false);
		}
	}, [guildId, snippets, t]);

	const addAttribute = useCallback(async () => {
		const name = newAttrName.trim();
		const val = Number.parseFloat(newAttrValue);
		if (!name || Number.isNaN(val)) return;
		setAddingAttr(true);
		setAttrAddError(null);
		try {
			const res = await userApi.validateEntries(guildId, "attributes", { [name]: val });
			if (res.data.errors[name] !== undefined) {
				const msg =
					res.data.errors[name] === "containsHyphen"
						? t("userConfig.attrHyphenError")
						: t("userConfig.addInvalidAttr", { name });
				setAttrAddError(msg);
				return;
			}
			setAttributes((prev) => ({ ...prev, [name]: val }));
			setNewAttrName("");
			setNewAttrValue("");
		} catch {
			setAttrAddError(t("userConfig.saveError"));
		} finally {
			setAddingAttr(false);
		}
	}, [guildId, newAttrName, newAttrValue, t]);

	const deleteAttribute = useCallback((key: string) => {
		setAttributes((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	const renameAttribute = useCallback((oldName: string, newName: string) => {
		setAttributes((prev) => {
			const entries = Object.entries(prev);
			const idx = entries.findIndex(([k]) => k === oldName);
			if (idx === -1) return prev;
			entries[idx] = [newName, entries[idx][1]];
			return Object.fromEntries(entries);
		});
	}, []);

	const updateAttributeValue = useCallback((name: string, value: number) => {
		setAttributes((prev) => ({ ...prev, [name]: value }));
	}, []);

	const importAttributes = useCallback(
		(e: InputEvent & { target: HTMLInputElement }) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = async () => {
				try {
					const parsed = JSON.parse(reader.result as string);
					if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
						setAttrError(t("userConfig.importError"));
						return;
					}
					const res = await userApi.validateEntries(guildId, "attributes", parsed);
					const { valid, errors } = res.data;
					setAttributes((prev) => ({ ...prev, ...(valid as Record<string, number>) }));
					const errCount = Object.keys(errors).length;
					const okCount = Object.keys(valid).length;
					if (errCount > 0) {
						setAttrError(t("userConfig.importPartial", { ok: okCount, err: errCount }));
					} else if (okCount > 0) {
						setAttrError(null);
						setAttrSuccess(true);
						setTimeout(() => setAttrSuccess(false), 3000);
					}
				} catch {
					setAttrError(t("userConfig.importError"));
				} finally {
					e.target.value = "";
				}
			};
			reader.readAsText(file);
		},
		[guildId, t]
	);

	const saveAttributes = useCallback(async () => {
		setSavingAttrs(true);
		setAttrError(null);
		try {
			await userApi.updateUserConfig(guildId, { attributes });
			setAttrSuccess(true);
			setTimeout(() => setAttrSuccess(false), 3000);
		} catch {
			setAttrError(t("userConfig.saveError"));
		} finally {
			setSavingAttrs(false);
		}
	}, [guildId, attributes, t]);

	const saveTemplate = useCallback(async () => {
		setSavingTemplate(true);
		setTemplateError(null);
		try {
			await userApi.updateUserConfig(guildId, { createLinkTemplate: template });
			setTemplateSuccess(true);
			setTimeout(() => setTemplateSuccess(false), 3000);
		} catch {
			setTemplateError(t("userConfig.saveError"));
		} finally {
			setSavingTemplate(false);
		}
	}, [guildId, template, t]);

	const resetTemplate = useCallback(() => setTemplate(DEFAULT_TEMPLATE), []);

	const snippetsState = useMemo<SnippetsState>(
		() => ({
			data: snippets,
			newName: newSnippetName,
			newValue: newSnippetValue,
			adding: addingSnippet,
			addError: snippetAddError,
			error: snippetError,
			success: snippetSuccess,
			saving: savingSnippets,
			importRef: snippetImportRef,
			setNewName: setNewSnippetName,
			setNewValue: setNewSnippetValue,
			setAddError: setSnippetAddError,
			setError: setSnippetError,
			onRename: renameSnippet,
			onValueChange: updateSnippetValue,
			onDelete: deleteSnippet,
			onAdd: addSnippet,
			onSave: saveSnippets,
			onImportChange: importSnippets,
		}),
		[
			snippets,
			newSnippetName,
			newSnippetValue,
			addingSnippet,
			snippetAddError,
			snippetError,
			snippetSuccess,
			savingSnippets,
			renameSnippet,
			updateSnippetValue,
			deleteSnippet,
			addSnippet,
			saveSnippets,
			importSnippets,
		]
	);

	const attributesState = useMemo<AttributesState>(
		() => ({
			data: attributes,
			newName: newAttrName,
			newValue: newAttrValue,
			adding: addingAttr,
			addError: attrAddError,
			error: attrError,
			success: attrSuccess,
			saving: savingAttrs,
			importRef: attrImportRef,
			setNewName: setNewAttrName,
			setNewValue: setNewAttrValue,
			setAddError: setAttrAddError,
			setError: setAttrError,
			onRename: renameAttribute,
			onValueChange: updateAttributeValue,
			onDelete: deleteAttribute,
			onAdd: addAttribute,
			onSave: saveAttributes,
			onImportChange: importAttributes,
		}),
		[
			attributes,
			newAttrName,
			newAttrValue,
			addingAttr,
			attrAddError,
			attrError,
			attrSuccess,
			savingAttrs,
			renameAttribute,
			updateAttributeValue,
			deleteAttribute,
			addAttribute,
			saveAttributes,
			importAttributes,
		]
	);

	const templateState = useMemo<TemplateState>(
		() => ({
			value: template,
			setValue: setTemplate,
			saving: savingTemplate,
			success: templateSuccess,
			error: templateError,
			setError: setTemplateError,
			onSave: saveTemplate,
			onReset: resetTemplate,
		}),
		[
			template,
			savingTemplate,
			templateSuccess,
			templateError,
			saveTemplate,
			resetTemplate,
		]
	);

	return (
		<Stack spacing={2}>
			<Snippets state={snippetsState} />
			<Attributes state={attributesState} />
			<Links state={templateState} />
		</Stack>
	);
}
