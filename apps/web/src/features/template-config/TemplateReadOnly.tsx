import { templateApi } from "@dicelette/api";
import type { StatisticalTemplate } from "@dicelette/core";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { useI18n } from "@shared";
import { useEffect, useState } from "react";
import { TemplateView } from "./sections";

export default function TemplateReadOnly({ guildId }: { guildId: string }) {
	const { t } = useI18n();
	const [template, setTemplate] = useState<StatisticalTemplate | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		setLoading(true);
		setError(false);
		templateApi
			.get(guildId, { signal: controller.signal })
			.then((res) => setTemplate(res.data))
			.catch(() => {
				if (!controller.signal.aborted) setError(true);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [guildId]);

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
				<CircularProgress size={24} />
			</Box>
		);
	}

	if (error) {
		return <Alert severity="error">{t("dashboard.loadError")}</Alert>;
	}

	if (!template) {
		return (
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				{t("config.noTemplate")}
			</Typography>
		);
	}

	return <TemplateView template={template} />;
}
