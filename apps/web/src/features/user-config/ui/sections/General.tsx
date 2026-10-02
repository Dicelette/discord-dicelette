import { userApi } from "@dicelette/api";
import {
	getUserOption,
	getUserOptionsBySection,
	parseUserOption,
	type UserOptionKey,
	type UserSettingsData,
} from "@dicelette/types";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	FormControlLabel,
	Switch,
	TextField,
} from "@mui/material";
import { TransWithLink, useI18n } from "@shared";
import { memo, useState } from "react";
import { FormAccordion } from "../atoms";
import { useSaveSuccessToast } from "./hooks";
import { actionsBoxSx, alertMbSx } from "./styles.ts";

interface Props {
	guildId: string;
	initialConfig?: Partial<UserSettingsData> | null;
}

type OptionValue = string | boolean;

const GENERAL_KEYS = getUserOptionsBySection("general");

function General({ guildId, initialConfig }: Props) {
	const { t } = useI18n();
	const [values, setValues] = useState<Record<string, OptionValue>>(() =>
		Object.fromEntries(
			GENERAL_KEYS.map((key) => {
				const def = getUserOption(key);
				const initial = initialConfig?.[key];
				return [key, initial ?? (def.kind === "boolean" ? false : "")];
			})
		)
	);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [success, setSuccess] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	useSaveSuccessToast(success);

	const validate = (key: UserOptionKey, value: OptionValue) => {
		const parsed = parseUserOption(key, value);
		return parsed.ok ? null : t("userConfig.optionInvalid", { error: parsed.error });
	};

	const handleChange = (key: UserOptionKey, value: OptionValue) => {
		setValues((prev) => ({ ...prev, [key]: value }));
		setSaveError(null);
		setErrors((prev) => {
			const { [key]: _removed, ...rest } = prev;
			const error = validate(key, value);
			return error ? { ...rest, [key]: error } : rest;
		});
	};

	const handleSave = async () => {
		const newErrors: Record<string, string> = {};
		for (const key of GENERAL_KEYS) {
			const error = validate(key, values[key]);
			if (error) newErrors[key] = error;
		}
		setErrors(newErrors);
		if (Object.keys(newErrors).length > 0) return;

		setSaving(true);
		setSuccess(false);
		setSaveError(null);
		try {
			await userApi.updateUserConfig(guildId, values);
			setSuccess(true);
			setTimeout(() => setSuccess(false), 3000);
		} catch {
			setSaveError(t("userConfig.saveError"));
		} finally {
			setSaving(false);
		}
	};

	return (
		<FormAccordion title={t("userConfig.sections.general")} defaultExpanded>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
				{GENERAL_KEYS.map((key) => {
					const def = getUserOption(key);
					const label = t(`userConfig.options.${key}.label`);
					const helperKey = def.helperLink
						? `userConfig.options.${key}.helper`
						: `userSettings.options.${key}.description`;
					if (def.kind === "boolean")
						return (
							<FormControlLabel
								key={key}
								label={label}
								control={
									<Switch
										checked={values[key] === true}
										onChange={(e) => handleChange(key, e.target.checked)}
									/>
								}
							/>
						);
					const helper = def.helperLink ? (
						<TransWithLink
							i18nKey={helperKey}
							href={def.helperLink.href}
							linkText={def.helperLink.text}
						/>
					) : (
						t(helperKey)
					);
					return (
						<TextField
							key={key}
							fullWidth
							size="small"
							label={label}
							value={values[key]}
							onChange={(e) => handleChange(key, e.target.value)}
							error={!!errors[key]}
							helperText={errors[key] ?? helper}
							slotProps={{
								input: { sx: { fontFamily: "var(--code-font-family)" } },
							}}
						/>
					);
				})}
			</Box>
			<Box sx={actionsBoxSx}>
				<Button
					variant="contained"
					onClick={handleSave}
					disabled={saving || Object.keys(errors).length > 0}
					startIcon={saving ? <CircularProgress size={16} /> : undefined}
				>
					{saving ? t("common.saving") : t("common.save")}
				</Button>
			</Box>
			{saveError && (
				<Alert severity="error" sx={alertMbSx} onClose={() => setSaveError(null)}>
					{saveError}
				</Alert>
			)}
		</FormAccordion>
	);
}

export default memo(General);
