import { TextField, type TextFieldProps } from "@mui/material";
import { FastField, type FieldProps } from "formik";
import type { ChangeEvent, FC, HTMLInputTypeAttribute } from "react";
import { useEffect, useRef, useState } from "react";
import { BASE_TABLEFIELD_SX, mergeSx } from "../styles";

type TablefieldProps = TextFieldProps & {
	autoFocus?: boolean;
	name: string;
	type?: HTMLInputTypeAttribute;
};

const DebouncedField = ({
	field,
	meta,
	form,
	props,
}: {
	field: FieldProps<string>["field"];
	meta: FieldProps<string>["meta"];
	form: FieldProps<string>["form"];
	props: TablefieldProps;
}) => {
	const [localValue, setLocalValue] = useState(field.value);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		setLocalValue(field.value);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [field.value]);

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setLocalValue(value);
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => {
			form.setFieldValue(name, value, false);
		}, 120);
	};

	return (
		<TextField
			{...props}
			value={localValue}
			onChange={handleChange}
			onBlur={field.onBlur}
			autoFocus={props.autoFocus}
			sx={mergeSx(BASE_TABLEFIELD_SX, props.sx)}
			error={props.error !== undefined ? props.error : !!meta.error}
			size="small"
			name={field.name}
			type={props.type}
		/>
	);
};

const Tablefield: FC<TablefieldProps> = (props) => (
	<FastField name={props.name}>
		{({ field, meta, form }: FieldProps<string>) => (
			<DebouncedField field={field} meta={meta} form={form} props={props} />
		)}
	</FastField>
);

export default Tablefield;
