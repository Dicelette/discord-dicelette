export function errorCode(error: unknown, t: (key: string) => string): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return t("template.errors.validation");
}
