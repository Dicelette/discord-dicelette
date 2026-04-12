import { Draggable } from "@hello-pangea/dnd";
import { Box, Tooltip } from "@mui/material";
import { useI18n } from "@shared";
import { memo, type ReactElement, useCallback, useMemo } from "react";
import { Tablefield } from "../../Atoms";
import CopyButton from "../../Atoms/button/copyButton";
import RemoveButton from "../../Atoms/button/removeButton";
import type { MacroValues } from "../../interfaces";
import { createFormItemId } from "../../utils";
import { BTN_CELL_SX, CELL_SX, DUPLICATE_ROW_SX, ROW_SX } from "../styles";
import { macroErrorMessage, macroValueErrorMessage } from "./errors";

const EMPTY_MACRO: MacroValues = { name: "", value: "" };

type DiceRowProps = {
	item?: MacroValues;
	isDuplicate?: boolean;
	index: number;
	length?: number;
	duplicateIndices?: number[];
	macro?: MacroValues[];
	push: (value: MacroValues) => void;
	remove: (index: number) => void;
};

const DiceRow = ({
	item,
	isDuplicate,
	index,
	length,
	duplicateIndices,
	macro,
	push,
	remove,
}: DiceRowProps): ReactElement => {
	const { t } = useI18n();
	const dice = item ?? macro?.[index] ?? EMPTY_MACRO;
	const normalizedLength = length ?? macro?.length ?? 0;
	const normalizedDuplicate =
		isDuplicate ?? (duplicateIndices ? duplicateIndices.includes(index) : false);

	const nameMsgKey = useMemo(
		() => macroErrorMessage(index, normalizedDuplicate ? [index] : [], dice),
		[index, normalizedDuplicate, dice]
	);
	const valueMsgKey = useMemo(() => macroValueErrorMessage(dice), [dice]);

	const nameMsg = nameMsgKey ? t(nameMsgKey) : "";
	const valueMsg = valueMsgKey ? t(valueMsgKey) : "";

	const handleCopy = useCallback(
		() =>
			push({
				...dice,
				id: createFormItemId("macro"),
			}),
		[push, dice]
	);
	const handleRemove = useCallback(() => remove(index), [remove, index]);

	return (
		<Draggable
			key={dice.id || index}
			draggableId={String(dice.id || index)}
			index={index}
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
						<CopyButton maxLen={25} length={normalizedLength} onClick={handleCopy} />
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tooltip title={nameMsg} arrow placement="top">
							<span>
								<Tablefield
									name={`damages[${index}].name`}
									label={t("template.name")}
									id={`Dice-Nom-${index}`}
									error={!!nameMsg}
								/>
							</span>
						</Tooltip>
					</Box>
					<Box component="td" sx={CELL_SX}>
						<Tooltip title={valueMsg} arrow placement="top">
							<span>
								<Tablefield
									name={`damages[${index}].value`}
									label={t("template.value")}
									id={`Value-${index}`}
									error={!!valueMsg}
								/>
							</span>
						</Tooltip>
					</Box>
					<Box component="td" sx={BTN_CELL_SX}>
						<RemoveButton onClick={handleRemove} />
					</Box>
				</Box>
			)}
		</Draggable>
	);
};

export default memo(DiceRow);
