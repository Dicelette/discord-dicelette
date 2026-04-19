import axios, {
	type AxiosError,
	AxiosHeaders,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";

export const api = axios.create({
	baseURL: "/api",
	withCredentials: true,
});

interface EtagCacheEntry {
	etag: string;
	data: unknown;
}

const etagCache = new Map<string, EtagCacheEntry>();

function buildGetCacheKey(config: InternalAxiosRequestConfig): string | null {
	const method = (config.method ?? "get").toLowerCase();
	if (method !== "get") return null;
	const url = config.url ?? "";
	const params = config.params ? JSON.stringify(config.params) : "";
	return `${url}?${params}`;
}

api.interceptors.request.use((config) => {
	const key = buildGetCacheKey(config);
	if (!key) return config;

	const cached = etagCache.get(key);
	if (!cached) return config;

	if (config.headers && typeof config.headers.set === "function") {
		config.headers.set("If-None-Match", cached.etag);
	} else {
		const headers = AxiosHeaders.from(config.headers);
		headers.set("If-None-Match", cached.etag);
		config.headers = headers;
	}

	return config;
});

api.interceptors.response.use(
	(response) => {
		const key = buildGetCacheKey(response.config);
		if (!key) return response;

		const etag = response.headers?.etag;
		if (typeof etag === "string" && etag.length > 0) {
			etagCache.set(key, { etag, data: response.data });
		}
		return response;
	},
	(error: AxiosError) => {
		const response = error.response;
		const config = error.config as InternalAxiosRequestConfig | undefined;
		if (response?.status === 304 && config) {
			const key = buildGetCacheKey(config);
			if (key) {
				const cached = etagCache.get(key);
				if (cached) {
					const replay: AxiosResponse = {
						...response,
						status: 200,
						statusText: "OK",
						data: cached.data,
					};
					return Promise.resolve(replay);
				}
			}
		}

		return Promise.reject(error);
	}
);
