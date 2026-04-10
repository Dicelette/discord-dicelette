import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import {
	FormControl,
	FormHelperText,
	IconButton,
	InputAdornment,
	InputLabel,
	OutlinedInput,
} from "@mui/material";
import * as React from "react";

const inputAdornmentSx = {
	flexDirection: "column",
	maxHeight: "unset",
	alignSelf: "stretch",
	borderLeft: "1px solid",
	borderColor: "divider",
	ml: 0,
	"& button": {
		py: 0,
		flex: 1,
		borderRadius: 0.5,
	},
} as const;

const arrowUpSx = { transform: "translateY(2px)" } as const;
const arrowDownSx = { transform: "translateY(-2px)" } as const;
const outlinedInputSx = { pr: 0 } as const;
const formHelperTextSx = { ml: 0, "&:empty": { mt: 0 } } as const;

/**
 * This component is a placeholder for FormControl to correctly set the shrink label state on SSR.
 */
function SSRInitialFilled(_: BaseNumberField.Root.Props) {
	return null;
}
SSRInitialFilled.muiName = "Input";

export default function NumberField({
	id: idProp,
	label,
	error,
	size = "medium",
	...other
}: BaseNumberField.Root.Props & {
	label?: React.ReactNode;
	size?: "small" | "medium";
	error?: boolean;
	helperText?: React.ReactNode;
}) {
	let id = React.useId();
	if (idProp) {
		id = idProp;
	}
	return (
		<BaseNumberField.Root
			{...other}
			render={(props, state) => (
				<FormControl
					size={size}
					ref={props.ref}
					disabled={state.disabled}
					required={state.required}
					error={error}
					variant="outlined"
				>
					{props.children}
				</FormControl>
			)}
		>
			<SSRInitialFilled {...other} />
			<InputLabel htmlFor={id}>{label}</InputLabel>
			<BaseNumberField.Input
				id={id}
				render={(props, state) => (
					<OutlinedInput
						label={label}
						inputRef={props.ref}
						value={state.inputValue}
						onBlur={props.onBlur}
						onChange={props.onChange}
						onKeyUp={props.onKeyUp}
						onKeyDown={props.onKeyDown}
						onFocus={props.onFocus}
						slotProps={{
							input: props,
						}}
						endAdornment={
							<InputAdornment
								position="end"
								sx={inputAdornmentSx}
							>
								<BaseNumberField.Increment
									render={<IconButton size={size} aria-label="Increase" />}
								>
									<KeyboardArrowUp
										fontSize={size}
										sx={arrowUpSx}
									/>
								</BaseNumberField.Increment>

								<BaseNumberField.Decrement
									render={<IconButton size={size} aria-label="Decrease" />}
								>
									<KeyboardArrowDown
										fontSize={size}
										sx={arrowDownSx}
									/>
								</BaseNumberField.Decrement>
							</InputAdornment>
						}
						sx={outlinedInputSx}
					/>
				)}
			/>
			<FormHelperText sx={formHelperTextSx}>
				{other.helperText}
			</FormHelperText>
		</BaseNumberField.Root>
	);
}
