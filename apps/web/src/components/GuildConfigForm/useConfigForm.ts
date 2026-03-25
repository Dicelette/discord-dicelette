import type { ApiGuildData } from "@dicelette/types";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import type { Channel } from "./types";

export function useConfigForm(config: ApiGuildData, channels: Channel[]) {
	const { control, handleSubmit, reset, formState, watch, setValue } =
		useForm<ApiGuildData>({
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

	// When disableThread is activated, clear rollChannel (mutually exclusive)
	// Skip on initial mount to avoid marking the form dirty before any user interaction
	const isFirstRender = useRef(true);
	const disableThread = watch("disableThread");
	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		if (disableThread) {
			setValue("rollChannel", undefined, { shouldDirty: true });
		}
	}, [disableThread, setValue]);

	const textChannels = useMemo(() => channels.filter((c) => c.type === 0), [channels]);

	return { control, handleSubmit, isDirty, reset, textChannels };
}
