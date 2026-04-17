import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

type HttpMethod = "get" | "post" | "patch" | "delete" | "put";

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
		const axiosConfig: AxiosRequestConfig = {
			...config,
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
