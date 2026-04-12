import { TextField, type TextFieldProps } from "@mui/material";
import { FastField, type FieldProps } from "formik";
import type { FC, HTMLInputTypeAttribute } from "react";
import { useEffect, useRef, useState } from "react";
import { BASE_TEXTFIELD_SX, mergeSx } from "../styles";

type TextfieldProps = TextFieldProps & {
	autoFocus?: boolean;
	name: string;
	type?: HTMLInputTypeAttribute;
};

/**
 * Uses FastField + local state so keystrokes update the input immediately
 * and the Formik store only after 120 ms of inactivity.
 * This prevents the heavy Statistics / Macro / CustomCritical blocks
 * from re-rendering on every keystroke.
 */
const DebouncedTextfield = ({
	field,
	meta,
	form,
	props,
}: {
	field: FieldProps<string | number>["field"];
	meta: FieldProps<string | number>["meta"];
	form: FieldProps<string | number>["form"];
	props: TextfieldProps;
}) => {
	const [localValue, setLocalValue] = useState<string | number>(field.value ?? "");
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	// Sync when Formik resets the field (e.g. enableReinitialize)
	useEffect(() => {
		setLocalValue(field.value ?? "");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [field.value]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setLocalValue(value);
		clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => {
			form.setFieldValue(name, value, false);
		}, 120);
	};

	return (
		<TextField
			{...props}
			value={localValue}
			onChange={props.onChange ?? handleChange}
			onBlur={field.onBlur}
			autoFocus={props.autoFocus}
			sx={mergeSx(BASE_TEXTFIELD_SX, props.sx)}
			error={!!meta.error || (props.error ?? false)}
			size="small"
			name={field.name}
			type={props.type}
		/>
	);
};

const Textfield: FC<TextfieldProps> = (props) => (
	<FastField name={props.name}>
		{({ field, meta, form }: FieldProps<string | number>) => (
			<DebouncedTextfield field={field} meta={meta} form={form} props={props} />
		)}
	</FastField>
);

export default Textfield;
