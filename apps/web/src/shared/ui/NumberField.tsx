import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { Add, Remove } from "@mui/icons-material";
import {
	FormControl,
	FormHelperText,
	IconButton,
	InputAdornment,
	InputLabel,
	OutlinedInput,
	type OutlinedInputProps,
	type SxProps,
	type Theme,
} from "@mui/material";
import * as React from "react";

export interface NumberFieldProps {
	id?: string;
	label?: React.ReactNode;
	helperText?: React.ReactNode;
	error?: boolean;
	disabled?: boolean;
	fullWidth?: boolean;
	required?: boolean;
	readOnly?: boolean;
	name?: string;
	placeholder?: string;
	size?: OutlinedInputProps["size"];
	value?: number | null;
	defaultValue?: number;
	min?: number;
	max?: number;
	step?: number | "any";
	allowOutOfRange?: boolean;
	sx?: SxProps<Theme>;
	onChange?: (value: number | null) => void;
	onValueCommitted?: (value: number | null) => void;
	incrementAriaLabel?: string;
	decrementAriaLabel?: string;
}

export default function NumberField({
	id,
	label,
	helperText,
	error = false,
	disabled = false,
	fullWidth = true,
	required = false,
	readOnly = false,
	name,
	placeholder,
	size = "medium",
	value,
	defaultValue,
	min,
	max,
	step = 1,
	allowOutOfRange = false,
	sx,
	onChange,
	onValueCommitted,
	incrementAriaLabel = "Increment value",
	decrementAriaLabel = "Decrement value",
}: NumberFieldProps) {
	const generatedId = React.useId();
	const inputId = id ?? generatedId;
	const iconSize = size === "small" ? "small" : "medium";

	return (
		<FormControl
			error={error}
			disabled={disabled}
			required={required}
			fullWidth={fullWidth}
			sx={sx}
		>
			{label ? (
				<InputLabel htmlFor={inputId} size={size} shrink>
					{label}
				</InputLabel>
			) : null}

			<BaseNumberField.Root
				name={name}
				value={value}
				defaultValue={defaultValue}
				min={min}
				max={max}
				step={step}
				allowOutOfRange={allowOutOfRange}
				disabled={disabled}
				readOnly={readOnly}
				required={required}
				onValueChange={(next) => onChange?.(next)}
				onValueCommitted={(next) => onValueCommitted?.(next)}
				style={{ display: "contents" }}
			>
				<OutlinedInput
					id={inputId}
					size={size}
					label={label}
					error={error}
					placeholder={placeholder}
					fullWidth={fullWidth}
					disabled={disabled}
					inputComponent={BaseNumberField.Input as any}
					endAdornment={
						<InputAdornment position="end" sx={{ gap: 0.25 }}>
							<BaseNumberField.Decrement
								aria-label={decrementAriaLabel}
								render={
									<IconButton edge="end" size={iconSize}>
										<Remove fontSize="inherit" />
									</IconButton>
								}
							/>
							<BaseNumberField.Increment
								aria-label={incrementAriaLabel}
								render={
									<IconButton edge="end" size={iconSize}>
										<Add fontSize="inherit" />
									</IconButton>
								}
							/>
						</InputAdornment>
					}
				/>
			</BaseNumberField.Root>

			{helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
		</FormControl>
	);
}
