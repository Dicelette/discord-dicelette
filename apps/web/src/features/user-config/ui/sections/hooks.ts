import { useEffect, useRef, useMemo } from "react";
import { useListRef } from "react-window";
import { useI18n } from "@shared";
import { useToast } from "../../../../providers";

const ITEM_SIZE = 32;
const MAX_LIST_HEIGHT = 300;

/** Hook to auto-scroll list to bottom when items are added */
export function useAutoScrollToNewItem(itemCount: number) {
	const listRef = useListRef(null);
	const prevCountRef = useRef(itemCount);

	useEffect(() => {
		if (itemCount > prevCountRef.current) {
			listRef.current?.scrollToRow({ index: itemCount - 1, align: "end" });
		}
		prevCountRef.current = itemCount;
	}, [itemCount, listRef.current?.scrollToRow]);

	return listRef;
}

/** Hook to memoize list style with scrollbar styling */
export function useListStyle(itemCount: number) {
	return useMemo(
		() => ({
			height: Math.min(itemCount * ITEM_SIZE, MAX_LIST_HEIGHT),
			width: "100%" as const,
			scrollbarWidth: "thin" as const,
			scrollbarColor: "rgba(255, 255, 255, 0.2) transparent",
		}),
		[itemCount]
	);
}

/** Hook to show success toast when operation completes */
export function useSaveSuccessToast(success: boolean) {
	const { t } = useI18n();
	const { enqueueToast } = useToast();

	useEffect(() => {
		if (success) enqueueToast(t("userConfig.saveSuccess"));
	}, [success, enqueueToast, t]);
}
