import { Draggable } from "@hello-pangea/dnd";
import { Box, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useI18n } from "@shared";
import { memo, type ReactElement, useCallback, useMemo } from "react";
import { Tablefield } from "../../Atoms";
import CopyButton from "../../Atoms/button/copyButton";
import RemoveButton from "../../Atoms/button/removeButton";
import type { MacroValues } from "../../interfaces";
import { macroErrorMessage, macroValueErrorMessage } from "./errors";

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

type DiceRowProps = {
	duplicateIndices: number[];
	index: number;
	macro: MacroValues[];
	push: (value: MacroValues) => void;
	remove: (index: number) => void;
};

const DiceRow = ({
	duplicateIndices,
	index,
	macro,
	push,
	remove,
}: DiceRowProps): ReactElement => {
	const { t } = useI18n();
	const dice = macro[index];
	const { name, value } = dice;

	const nameMsgKey = useMemo(
		() => macroErrorMessage(index, duplicateIndices, dice),
		[index, duplicateIndices, dice]
	);
	const valueMsgKey = useMemo(() => macroValueErrorMessage(dice), [dice]);

	const nameMsg = nameMsgKey ? t(nameMsgKey) : "";
	const valueMsg = valueMsgKey ? t(valueMsgKey) : "";

	const handleCopy = useCallback(() => push({ name, value }), [push, name, value]);
	const handleRemove = useCallback(() => remove(index), [remove, index]);

	const isDuplicate = duplicateIndices.includes(index);

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
					sx={{
						...ROW_SX,
						...(isDuplicate && {
							bgcolor: (t) => alpha(t.palette.error.main, 0.08),
						}),
					}}
				>
					<Box component="td" sx={BTN_CELL_SX}>
						<CopyButton maxLen={25} length={macro.length} onClick={handleCopy} />
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
