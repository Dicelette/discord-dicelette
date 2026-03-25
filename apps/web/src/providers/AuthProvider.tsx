import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { authApi, type DiscordUser } from "../shared";

interface AuthContextType {
	user: DiscordUser | null;
	loading: boolean;
	logout: () => Promise<void>;
}

const AUTH_CONTEXT = createContext<AuthContextType>({
	user: null,
	loading: true,
	logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<DiscordUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		authApi
			.me()
			.then((res) => setUser(res.data))
			.catch(() => setUser(null))
			.finally(() => setLoading(false));
	}, []);

	const logout = async () => {
		await authApi.logout();
		setUser(null);
	};

	return (
		<AUTH_CONTEXT.Provider value={{ user, loading, logout }}>
			{children}
		</AUTH_CONTEXT.Provider>
	);
}

export function useAuth() {
	return useContext(AUTH_CONTEXT);
}
