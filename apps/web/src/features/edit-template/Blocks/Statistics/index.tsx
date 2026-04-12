import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Box } from "@mui/material";
import { FieldArray, type FormikHelpers } from "formik";
import { memo, useCallback, useEffect, useId, useMemo, useRef } from "react";
import { Section } from "../../Atoms";
import type { DataForm } from "../../interfaces";
import { SCROLLABLE_TBODY_SX } from "../styles";
import RenderRow from "./RenderRow";

type StatisticsProps = {
	values: DataForm;
	setFieldValue: FormikHelpers<DataForm>["setFieldValue"];
};

type CryptoLike = { randomUUID?: () => string };

const createStatisticId = (): string => {
	const browserCrypto = (globalThis as { crypto?: CryptoLike }).crypto;
	return (
		browserCrypto?.randomUUID?.() ??
		`stat-${Date.now()}-${Math.random().toString(16).slice(2)}`
	);
};

const StatisticsBlock = ({ values, setFieldValue }: StatisticsProps) => {
	const droppableId = useId();
	const lastLengthRef = useRef(0);
	const tbodyScrollRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (values.statistics.length > lastLengthRef.current) {
			values.statistics.forEach((s) => {
				if (!s.id) s.id = createStatisticId();
			});
			tbodyScrollRef.current?.scrollTo({
				top: tbodyScrollRef.current.scrollHeight,
				behavior: "smooth",
			});
			lastLengthRef.current = values.statistics.length;
		}
	}, [values.statistics]);

	const duplicateIndices = useMemo(() => {
		const nameToFirstIndex = new Map<string, number>();
		const dups: number[] = [];
		values.statistics.forEach((stat, idx: number) => {
			if (!stat.name) return;
			const existing = nameToFirstIndex.get(stat.name);
			if (existing !== undefined) {
				dups.push(existing, idx);
			} else {
				nameToFirstIndex.set(stat.name, idx);
			}
		});
		return Array.from(new Set(dups));
	}, [values.statistics]);

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
							label="Statistiques"
							onAdd={() =>
								push({
									id: createStatisticId(),
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
						<Box component="table" sx={{ width: "100%" }}>
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
