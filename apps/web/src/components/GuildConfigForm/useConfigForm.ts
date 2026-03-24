import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import type { ApiGuildConfig } from "../../lib/api.ts";
import type { Channel } from "./types";

export function useConfigForm(config: ApiGuildConfig, channels: Channel[]) {
	const { control, handleSubmit, reset, formState } = useForm<ApiGuildConfig>({
		defaultValues: config,
	});

	const isDirty = formState.isDirty;

	useEffect(() => {
		reset(config);
	}, [config, reset]);

	useEffect(() => {
		if (!isDirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [isDirty]);

	const textChannels = useMemo(() => channels.filter((c) => c.type === 0), [channels]);

	return { control, handleSubmit, isDirty, textChannels };
}
