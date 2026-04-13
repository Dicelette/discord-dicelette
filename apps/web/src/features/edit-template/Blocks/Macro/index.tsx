import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Box } from "@mui/material";
import { useI18n } from "@shared";
import { FieldArray, type FormikHelpers } from "formik";
import { memo, useCallback, useEffect, useId, useMemo, useRef } from "react";
import { Section } from "../../Atoms";
import type { DataForm } from "../../interfaces";
import { createFormItemId } from "../../utils";
import { SCROLLABLE_TBODY_SX, TABLE_SX } from "../styles";
import RenderRow from "./RenderRow";

type MacroProps = {
	values: DataForm;
	setFieldValue: FormikHelpers<DataForm>["setFieldValue"];
};

const MacroBlock = ({ values, setFieldValue }: MacroProps) => {
	const { t } = useI18n();
	const droppableId = useId();
	const lastLengthRef = useRef(0);
	const tbodyScrollRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (values.damages.length > lastLengthRef.current) {
			tbodyScrollRef.current?.scrollTo({
				top: tbodyScrollRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
		lastLengthRef.current = values.damages.length;
	}, [values.damages]);

	const duplicateInMacros = useMemo(() => {
		const map = new Map<string, number>();
		const dups = new Set<number>();
		values.damages.forEach((d, i: number) => {
			if (!d.name) return;
			const first = map.get(d.name);
			if (first !== undefined) {
				dups.add(first);
				dups.add(i);
			} else map.set(d.name, i);
		});
		return dups;
	}, [values.damages]);
	const duplicateIndices = useMemo(
		() => Array.from(duplicateInMacros),
		[duplicateInMacros]
	);

	const onDragEnd = useCallback(
		(result: DropResult) => {
			if (!result.destination) return;
			if (result.source.index === result.destination.index) return;
			const items = [...values.damages];
			const [r] = items.splice(result.source.index, 1);
			items.splice(result.destination.index, 0, r);
			setFieldValue("damages", items);
		},
		[values.damages, setFieldValue]
	);

	return (
		<Box>
			<FieldArray name="damages">
				{({ push, remove }) => (
					<Box>
						<Section
							length={values.damages.length}
							type="macro"
							label={t("common.macro").toTitle()}
							onAdd={() => push({ id: createFormItemId("macro"), name: "", value: "" })}
						>
							{""}
						</Section>
						<Box component="table" sx={TABLE_SX}>
							<DragDropContext onDragEnd={onDragEnd}>
								<Droppable droppableId={`droppable-${droppableId}`}>
									{(provided) => (
										<Box
											component="tbody"
											{...provided.droppableProps}
											ref={(el: HTMLElement | null) => {
												provided.innerRef(el);
												tbodyScrollRef.current = el;
											}}
											sx={SCROLLABLE_TBODY_SX}
										>
											{values.damages.map((item, index: number) => (
												<RenderRow
													key={item.id || index}
													item={item}
													isDuplicate={duplicateInMacros.has(index)}
													index={index}
													length={values.damages.length}
													duplicateIndices={duplicateIndices}
													macro={values.damages}
													push={push}
													remove={remove}
												/>
											))}
											{provided.placeholder}
										</Box>
									)}
								</Droppable>
							</DragDropContext>
						</Box>
					</Box>
				)}
			</FieldArray>
		</Box>
	);
};

export default memo(
	MacroBlock,
	(prev, next) =>
		prev.values.damages === next.values.damages &&
		prev.setFieldValue === next.setFieldValue
);
