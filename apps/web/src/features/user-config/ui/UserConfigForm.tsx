import type { ApiUserConfig } from "@dicelette/api";
import { userApi } from "@dicelette/api";
import type { TemplateResult } from "@dicelette/types";
import Stack from "@mui/material/Stack";
import { useCallback } from "react";
import "uniformize";
import { useAttributesState, useSnippetsState, useTemplateState } from "../hooks";
import { Attributes, Links, Snippets } from "./sections";

interface Props {
	guildId: string;
	initialConfig: ApiUserConfig["userConfig"];
}

export default function UserConfigForm({ guildId, initialConfig }: Props) {
	const attrs = useAttributesState(
		guildId,
		initialConfig?.attributes ?? {},
		initialConfig?.ignoreNotfound ?? ""
	);

	const snippets = useSnippetsState(
		guildId,
		initialConfig?.snippets ?? {},
		attrs.data,
		attrs.replaceUnknownForValidation
	);

	const saveFn = useCallback(
		(template: TemplateResult) =>
			userApi.updateUserConfig(guildId, { createLinkTemplate: template }),
		[guildId]
	);

	const templateState = useTemplateState(initialConfig?.createLinkTemplate, saveFn);

	return (
		<Stack spacing={2}>
			<Snippets state={snippets} />
			<Attributes state={attrs} />
			<Links state={templateState} />
		</Stack>
	);
}
