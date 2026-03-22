import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

type ThemeMode = "light" | "dark";

interface ThemeModeContextValue {
	mode: ThemeMode;
	toggleMode: () => void;
}

const themeModeContext = createContext<ThemeModeContextValue>({
	mode: "dark",
	toggleMode: () => {},
});

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
	const [mode, setMode] = useState<ThemeMode>(() => {
		const stored = localStorage.getItem("themeMode");
		const initial: ThemeMode =
			stored === "light" || stored === "dark"
				? stored
				: window.matchMedia("(prefers-color-scheme: dark)").matches
					? "dark"
					: "light";
		document.documentElement.classList.toggle("dark", initial === "dark");
		return initial;
	});

	useEffect(() => {
		localStorage.setItem("themeMode", mode);
	}, [mode]);

	const toggleMode = useCallback(() => {
		setMode((prev) => {
			const next = prev === "dark" ? "light" : "dark";
			document.documentElement.classList.toggle("dark", next === "dark");
			return next;
		});
	}, []);

	const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

	return <themeModeContext.Provider value={value}>{children}</themeModeContext.Provider>;
}

export function useThemeMode() {
	return useContext(themeModeContext);
}
