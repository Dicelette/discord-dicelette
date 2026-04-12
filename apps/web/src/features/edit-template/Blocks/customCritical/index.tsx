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

type CustomCriticalProps = {
	values: DataForm;
	setFieldValue: FormikHelpers<DataForm>["setFieldValue"];
};

const CustomCriticalBlock = ({ values, setFieldValue }: CustomCriticalProps) => {
	const { t } = useI18n();
	const droppableId = useId();
	const lastLengthRef = useRef(0);
	const tbodyScrollRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (values.customCritical.length > lastLengthRef.current) {
			tbodyScrollRef.current?.scrollTo({
				top: tbodyScrollRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
		lastLengthRef.current = values.customCritical.length;
	}, [values.customCritical]);

	const duplicateIndices = useMemo(() => {
		const map = new Map<string, number>();
		const d = new Set<number>();
		values.customCritical.forEach((c, i: number) => {
			if (!c.name) return;
			const first = map.get(c.name);
			if (first !== undefined) {
				d.add(first);
				d.add(i);
			} else map.set(c.name, i);
		});
		return d;
	}, [values.customCritical]);
	const duplicateIndicesArray = useMemo(
		() => Array.from(duplicateIndices),
		[duplicateIndices]
	);

	const onDragEnd = useCallback(
		(result: DropResult) => {
			if (!result.destination) return;
			if (result.source.index === result.destination.index) return;
			const items = [...values.customCritical];
			const [r] = items.splice(result.source.index, 1);
			items.splice(result.destination.index, 0, r);
			setFieldValue("customCritical", items);
		},
		[values.customCritical, setFieldValue]
	);

	return (
		<Box>
			<FieldArray name="customCritical">
				{({ push, remove }) => (
					<Box>
						<Section
							length={values.customCritical.length}
							type="critical"
							label={t("template.customCritical")}
							onAdd={() =>
								push({
									id: createFormItemId("cc"),
									selection: ">=",
									name: "",
									formula: "",
									text: "",
									onNaturalDice: false,
									affectSkill: false,
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
											{values.customCritical.map((item, index: number) => (
												<RenderRow
													key={item.id || index}
													index={index}
													item={item}
													isDuplicate={duplicateIndices.has(index)}
													length={values.customCritical.length}
													duplicateIndices={duplicateIndicesArray}
													push={push}
													remove={remove}
													customCritical={values.customCritical}
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

export default memo(
	CustomCriticalBlock,
	(prev, next) =>
		prev.values.customCritical === next.values.customCritical &&
		prev.setFieldValue === next.setFieldValue
);
