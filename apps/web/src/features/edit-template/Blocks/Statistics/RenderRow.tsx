import { Draggable } from "@hello-pangea/dnd";
import { Box, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useI18n } from "@shared";
import { memo, type ReactElement, useCallback, useMemo } from "react";
import { Tablefield } from "../../Atoms";
import CopyButton from "../../Atoms/button/copyButton";
import RemoveButton from "../../Atoms/button/removeButton";
import StandaloneToggleButton from "../../Atoms/toggle-custom";
import type { StatisticFields } from "../../interfaces";
import {
	maximalErrorClass,
	maximalErrorMessage,
	minimalErrorClass,
	minimalErrorMessage,
	nameErrorClass,
	nameErrorMessage,
} from "./errors";

const ROW_SX = {
	display: "flex",
	flexDirection: { xs: "column", xl: "row" },
	alignItems: { xl: "center" },
	width: { xl: "100%" },
} as const;

const CELL_SX = { p: 1, width: { xs: "100%", xl: "auto" } } as const;
const BTN_CELL_SX = {
	p: { xs: 1, xl: "2px" },
	width: { xs: "100%", xl: "auto" },
} as const;

type StatisticsRowProps = {
	statIndex: number;
	duplicateIndices: number[];
	push: (value: StatisticFields) => void;
	remove: (index: number) => void;
	statistics: StatisticFields[];
	setFieldValue: (field: string, value: unknown) => unknown;
};

const StatisticsRow = ({
	statIndex,
	duplicateIndices,
	push,
	remove,
	statistics,
	setFieldValue,
}: StatisticsRowProps): ReactElement => {
	const { t } = useI18n();
	const stat = statistics[statIndex];
	const { max, min, combinaison, excluded, name } = stat;

	const nameErrClass = useMemo(() => nameErrorClass(name), [name]);
	const minErrClass = useMemo(
		() => minimalErrorClass(stat),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[stat.min, stat.max, stat.combinaison, stat]
	);
	const maxErrClass = useMemo(
		() => maximalErrorClass(stat),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[stat.min, stat.max, stat.combinaison, stat]
	);

	const nameMsgKey = useMemo(
		() => nameErrorMessage(statIndex, duplicateIndices, name),
		[statIndex, duplicateIndices, name]
	);
	const minMsgKey = useMemo(
		() => minimalErrorMessage(statIndex, stat),
		[statIndex, stat]
	);
	const maxMsgKey = useMemo(
		() => maximalErrorMessage(statIndex, stat),
		[statIndex, stat]
	);

	const nameMsg = nameMsgKey ? t(nameMsgKey) : "";
	const minMsg = minMsgKey ? t(minMsgKey) : "";
	const maxMsg = maxMsgKey ? t(maxMsgKey) : "";

	const handleCopy = useCallback(
		() => push({ name: "", max, min, combinaison, excluded }),
		[push, max, min, combinaison, excluded]
	);
	const handleRemove = useCallback(() => remove(statIndex), [remove, statIndex]);
	const handleToggleExcluded = useCallback(
		() => setFieldValue(`statistics[${statIndex}].excluded`, !excluded),
		[setFieldValue, statIndex, excluded]
	);

	const isDuplicate = duplicateIndices.includes(statIndex);

	return (
		<Draggable
			key={stat.id || statIndex}
			draggableId={String(stat.id || statIndex)}
			index={statIndex}
		>
			{(provided) => (
				<Box
					component="tr"
					ref={provided.innerRef}
					{...provided.draggableProps}
					{...provided.dragHandleProps}
					sx={{
						...ROW_SX,
						...(isDuplicate && {
							bgcolor: (t) => alpha(t.palette.error.main, 0.08),
						}),
					}}
				>
					<Box component="td" sx={BTN_CELL_SX}>
						<CopyButton length={statistics.length} maxLen={25} onClick={handleCopy} />
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tooltip title={nameMsg} arrow placement="top">
							<span>
								<Tablefield
									label={t("template.name")}
									name={`statistics[${statIndex}].name`}
									id={`Stats-Nom-${statIndex}`}
									className={nameErrClass}
									error={!!nameMsg}
								/>
							</span>
						</Tooltip>
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tooltip title={minMsg} arrow placement="top">
							<span>
								<Tablefield
									type="number"
									slotProps={{ htmlInput: { min: 0 } }}
									name={`statistics[${statIndex}].min`}
									label={t("template.min")}
									className={minErrClass}
									sx={{ width: { xs: "100%", xl: 100 } }}
									id={`Min-${statIndex}`}
									disabled={!!combinaison}
									error={!!minMsg}
								/>
							</span>
						</Tooltip>
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tooltip title={maxMsg} arrow placement="top">
							<span>
								<Tablefield
									type="number"
									slotProps={{ htmlInput: { min: 0 } }}
									name={`statistics[${statIndex}].max`}
									label={t("template.max")}
									id={`Max-${statIndex}`}
									className={maxErrClass}
									sx={{ width: { xs: "100%", xl: 100 } }}
									disabled={!!combinaison}
									error={!!maxMsg}
								/>
							</span>
						</Tooltip>
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tablefield
							label={t("template.combination")}
							name={`statistics[${statIndex}].combinaison`}
							disabled={!!(min || max)}
						/>
					</Box>
					<Box component="td" sx={CELL_SX}>
						<StandaloneToggleButton
							selected={!!excluded}
							onChange={handleToggleExcluded}
							opt="excludedStat"
						/>
					</Box>
					<Box component="td" sx={BTN_CELL_SX}>
						<RemoveButton onClick={handleRemove} />
					</Box>
				</Box>
			)}
		</Draggable>
	);
};

export default memo(StatisticsRow);
