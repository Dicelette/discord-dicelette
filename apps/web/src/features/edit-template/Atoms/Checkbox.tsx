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
	/** optional aria-label (camelCase) */
	ariaLabel?: string;
	/** optional aria-label (hyphenated form) to match JSX usage */
	"aria-label"?: string;
};

const CheckBox: FC<CheckboxProps> = (props) => {
	const { className, label, name, labelPlacement, id, ariaLabel } = props;
	const aria = ariaLabel ?? (props as any)["aria-label"];

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
								aria-label={aria}
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
