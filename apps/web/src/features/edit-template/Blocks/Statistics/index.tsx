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

type StatisticsProps = {
	values: DataForm;
	setFieldValue: FormikHelpers<DataForm>["setFieldValue"];
};

const StatisticsBlock = ({ values, setFieldValue }: StatisticsProps) => {
	const { t } = useI18n();
	const droppableId = useId();
	const lastLengthRef = useRef(0);
	const tbodyScrollRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (values.statistics.length > lastLengthRef.current) {
			tbodyScrollRef.current?.scrollTo({
				top: tbodyScrollRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
		lastLengthRef.current = values.statistics.length;
	}, [values.statistics]);

	const duplicateIndexSet = useMemo(() => {
		const nameToFirstIndex = new Map<string, number>();
		const dups = new Set<number>();
		values.statistics.forEach((stat, idx: number) => {
			if (!stat.name) return;
			const existing = nameToFirstIndex.get(stat.name);
			if (existing !== undefined) {
				dups.add(existing);
				dups.add(idx);
			} else {
				nameToFirstIndex.set(stat.name, idx);
			}
		});
		return dups;
	}, [values.statistics]);
	const duplicateIndices = useMemo(
		() => Array.from(duplicateIndexSet),
		[duplicateIndexSet]
	);

	const onDragEnd = useCallback(
		(result: DropResult) => {
			if (!result.destination) return;
			if (result.source.index === result.destination.index) return;
			const items = [...values.statistics];
			const [reorderedItem] = items.splice(result.source.index, 1);
			items.splice(result.destination.index, 0, reorderedItem);
			setFieldValue("statistics", items);
		},
		[values.statistics, setFieldValue]
	);

	return (
		<Box>
			<FieldArray name="statistics">
				{({ push, remove }) => (
					<Box>
						<Section
							type="stats"
							length={values.statistics.length}
							label={t("template.statistics")}
							onAdd={() =>
								push({
									id: createFormItemId("stat"),
									name: "",
									min: "",
									max: "",
									combinaison: "",
									excluded: false,
								})
							}
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
											{values.statistics.map((item, statIndex: number) => (
												<RenderRow
													key={item.id || statIndex}
													statIndex={statIndex}
													item={item}
													isDuplicate={duplicateIndexSet.has(statIndex)}
													length={values.statistics.length}
													duplicateIndices={duplicateIndices}
													push={push}
													remove={remove}
													statistics={values.statistics}
													setFieldValue={setFieldValue}
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

// Only re-render when the statistics array reference itself changes.
// Typing in General fields (diceType, total…) keeps values.statistics as the
// same reference, so this block stays frozen and skips its entire subtree.
export default memo(
	StatisticsBlock,
	(prev, next) =>
		prev.values.statistics === next.values.statistics &&
		prev.setFieldValue === next.setFieldValue
);
