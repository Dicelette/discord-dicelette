import { Draggable } from "@hello-pangea/dnd";
import { Box, Tooltip } from "@mui/material";
import { useI18n } from "@shared";
import { memo, type ReactElement, useCallback, useMemo } from "react";
import { Tablefield } from "../../Atoms";
import CopyButton from "../../Atoms/button/copyButton";
import RemoveButton from "../../Atoms/button/removeButton";
import StandaloneToggleButton from "../../Atoms/toggle-custom";
import type { StatisticFields } from "../../interfaces";
import { createFormItemId } from "../../utils";
import {
	BTN_CELL_SX,
	CELL_SX,
	DUPLICATE_ROW_SX,
	NUMBER_TABLE_FIELD_SX,
	ROW_SX,
} from "../styles";
import {
	maximalErrorClass,
	maximalErrorMessage,
	minimalErrorClass,
	minimalErrorMessage,
	nameErrorClass,
	nameErrorMessage,
} from "./errors";

const EMPTY_STAT: StatisticFields = { name: "", min: "", max: "", combinaison: "" };

type StatisticsRowProps = {
	statIndex: number;
	item?: StatisticFields;
	isDuplicate?: boolean;
	length?: number;
	duplicateIndices?: number[];
	statistics?: StatisticFields[];
	push: (value: StatisticFields) => void;
	remove: (index: number) => void;
	setFieldValue: (field: string, value: unknown) => unknown;
};

const StatisticsRow = ({
	statIndex,
	item,
	isDuplicate,
	length,
	duplicateIndices,
	statistics,
	push,
	remove,
	setFieldValue,
}: StatisticsRowProps): ReactElement => {
	const { t } = useI18n();
	const stat = item ?? statistics?.[statIndex] ?? EMPTY_STAT;
	const normalizedLength = length ?? statistics?.length ?? 0;
	const normalizedDuplicate =
		isDuplicate ?? (duplicateIndices ? duplicateIndices.includes(statIndex) : false);
	const { max, min, combinaison, excluded, name } = stat;

	// Use destructured primitives as deps so memos invalidate on value changes,
	// not on object reference changes (stat may be a new object each render).
	const nameErrClass = useMemo(() => nameErrorClass(name), [name]);
	const minErrClass = useMemo(
		() => minimalErrorClass({ name, min, max, combinaison }),
		[name, min, max, combinaison]
	);
	const maxErrClass = useMemo(
		() => maximalErrorClass({ name, min, max, combinaison }),
		[name, min, max, combinaison]
	);

	const nameMsgKey = useMemo(
		() => nameErrorMessage(statIndex, normalizedDuplicate ? [statIndex] : [], name),
		[statIndex, normalizedDuplicate, name]
	);
	const minMsgKey = useMemo(
		() => minimalErrorMessage(statIndex, { name, min, max, combinaison }),
		[statIndex, name, min, max, combinaison]
	);
	const maxMsgKey = useMemo(
		() => maximalErrorMessage(statIndex, { name, min, max, combinaison }),
		[statIndex, name, min, max, combinaison]
	);

	const nameMsg = nameMsgKey ? t(nameMsgKey) : "";
	const minMsg = minMsgKey ? t(minMsgKey) : "";
	const maxMsg = maxMsgKey ? t(maxMsgKey) : "";

	const handleCopy = useCallback(
		() =>
			push({
				...stat,
				id: createFormItemId("stat"),
			}),
		[push, stat]
	);
	const handleRemove = useCallback(() => remove(statIndex), [remove, statIndex]);
	const handleToggleExcluded = useCallback(
		() => setFieldValue(`statistics[${statIndex}].excluded`, !excluded),
		[setFieldValue, statIndex, excluded]
	);

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
					sx={[ROW_SX, normalizedDuplicate && DUPLICATE_ROW_SX]}
				>
					<Box component="td" sx={BTN_CELL_SX}>
						<CopyButton length={normalizedLength} maxLen={25} onClick={handleCopy} />
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
									sx={NUMBER_TABLE_FIELD_SX}
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
									sx={NUMBER_TABLE_FIELD_SX}
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
