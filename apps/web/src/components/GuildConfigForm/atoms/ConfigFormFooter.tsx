import { Box, Button, Typography } from "@mui/material";
import { useI18n } from "../../../i18n";

interface Props {
	isDirty: boolean;
	saving: boolean;
}

export default function ConfigFormFooter({ isDirty, saving }: Props) {
	const { t } = useI18n();
	return (
		<Box className="flex justify-end gap-3 items-center" sx={{ mt: 2 }}>
			{isDirty && (
				<Typography variant="body2" color="warning.main">
					{t("config.unsaved")}
				</Typography>
			)}
			<Button
				type="submit"
				variant="contained"
				size="large"
				disabled={saving}
				sx={{ minWidth: 160 }}
			>
				{saving ? t("common.saving") : t("common.save")}
			</Button>
		</Box>
	);
}
