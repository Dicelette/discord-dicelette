import type { ApiTemplateResult } from "../../lib/api";

export const DEFAULT_TEMPLATE: ApiTemplateResult = {
	results: "{{info}} {{result}}",
	final: "[[{{stats}} {{results}}]](<{{link}}>)",
	joinResult: "; ",
	format: {
		name: "__{{stat}}__:",
		info: "{{info}} -",
		dice: "{{dice}}",
		originalDice: "{{original_dice}}",
		character: "{{character}}",
	},
};

export const exportJson = (data: unknown, filename: string) => {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
};
