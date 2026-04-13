import { Checkbox, FormControlLabel } from "@mui/material";
import { Field, type FieldProps } from "formik";
import type { FC } from "react";

type CheckboxProps = {
	className?: string;
	label: string;
	name: string;
	labelPlacement?: "start" | "end" | "top" | "bottom";
	/** optional id to pass to the inner input element */
	id?: string;
};

const CheckBox: FC<CheckboxProps> = (props) => {
	const { className, label, name, labelPlacement, id } = props;

	return (
		<Field name={name}>
			{({ field }: FieldProps<boolean>) => {
				return (
					<FormControlLabel
						className={className}
						control={
							<Checkbox
								onChange={field.onChange}
								checked={field.checked}
								name={field.name}
								value={field.value}
								id={id ?? field.name}
							/>
						}
						labelPlacement={labelPlacement || "start"}
						label={label}
					/>
				);
			}}
		</Field>
	);
};

export default CheckBox;
