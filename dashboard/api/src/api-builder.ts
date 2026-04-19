import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

type HttpMethod = "get" | "post" | "patch" | "delete" | "put";

function isLikelyAxiosConfig(value: unknown): value is AxiosRequestConfig {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const candidate = value as Record<string, unknown>;
	return (
		"signal" in candidate ||
		"headers" in candidate ||
		"params" in candidate ||
		"timeout" in candidate ||
		"responseType" in candidate
	);
}

export function createGuildEndpoint<T>(
	api: AxiosInstance,
	method: HttpMethod,
	path: string,
	responseType?: AxiosRequestConfig["responseType"]
): (
	guildId: string,
	data?: unknown,
	config?: AxiosRequestConfig
) => Promise<AxiosResponse<T>> {
	return (guildId: string, data?: unknown, config?: AxiosRequestConfig) => {
		const fullPath = `/guilds/${guildId}${path}`;
		const requestConfig =
			(method === "get" || method === "delete") &&
			config === undefined &&
			isLikelyAxiosConfig(data)
				? data
				: config;
		const axiosConfig: AxiosRequestConfig = {
			...requestConfig,
			...(responseType && { responseType }),
		};

		if (method === "get" || method === "delete") {
			return api[method]<T>(fullPath, axiosConfig);
		}
		return api[method]<T>(fullPath, data, axiosConfig);
	};
}

export function createAuthEndpoint<T>(
	api: AxiosInstance,
	method: HttpMethod,
	path: string
): (data?: unknown, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>> {
	return (data?: unknown, config?: AxiosRequestConfig) => {
		if (method === "get" || method === "delete") {
			return api[method]<T>(path, data as AxiosRequestConfig | undefined);
		}
		return api[method]<T>(path, data, config);
	};
}
