export function errorCode(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "Erreur de validation du modèle";
}
