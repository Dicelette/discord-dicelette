import { createContext, useContext, useEffect, useState } from "react";
import type { DiscordUser } from "../lib/api";
import { authApi } from "../lib/api";

interface AuthContextType {
	user: DiscordUser | null;
	loading: boolean;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
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
		<AuthContext.Provider value={{ user, loading, logout }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	return useContext(AuthContext);
}
