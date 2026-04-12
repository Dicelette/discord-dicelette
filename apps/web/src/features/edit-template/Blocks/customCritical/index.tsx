import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Box } from "@mui/material";
import { FieldArray, type FormikHelpers } from "formik";
import { memo, useCallback, useEffect, useId, useMemo, useRef } from "react";
import { Section } from "../../Atoms";
import type { DataForm } from "../../interfaces";
import { SCROLLABLE_TBODY_SX } from "../styles";
import RenderRow from "./RenderRow";

type CustomCriticalProps = {
	values: DataForm;
	setFieldValue: FormikHelpers<DataForm>["setFieldValue"];
};

type CryptoLike = { randomUUID?: () => string };

const createCustomCriticalId = (): string => {
	const browserCrypto = (globalThis as { crypto?: CryptoLike }).crypto;
	return (
		browserCrypto?.randomUUID?.() ??
		`cc-${Date.now()}-${Math.random().toString(16).slice(2)}`
	);
};

const CustomCriticalBlock = ({ values, setFieldValue }: CustomCriticalProps) => {
	const droppableId = useId();
	const lastLengthRef = useRef(0);
	const tbodyScrollRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (values.customCritical.length > lastLengthRef.current) {
			values.customCritical.forEach((c) => {
				if (!c.id) c.id = createCustomCriticalId();
			});
			tbodyScrollRef.current?.scrollTo({
				top: tbodyScrollRef.current.scrollHeight,
				behavior: "smooth",
			});
			lastLengthRef.current = values.customCritical.length;
		}
	}, [values.customCritical]);

	const duplicateIndices = useMemo(() => {
		const map = new Map<string, number>();
		const d: number[] = [];
		values.customCritical.forEach((c, i: number) => {
			if (!c.name) return;
			const first = map.get(c.name);
			if (first !== undefined) d.push(first, i);
			else map.set(c.name, i);
		});
		return Array.from(new Set(d));
	}, [values.customCritical]);

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
							label="Critiques Personnalisés"
							onAdd={() =>
								push({
									id: createCustomCriticalId(),
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
											{values.customCritical.map((item, index: number) => (
												<RenderRow
													key={item.id || index}
													index={index}
													duplicateIndices={duplicateIndices}
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
