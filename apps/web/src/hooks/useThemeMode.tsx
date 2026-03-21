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

const ThemeModeContext = createContext<ThemeModeContextValue>({
	mode: "dark",
	toggleMode: () => {},
});

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
	const [mode, setMode] = useState<ThemeMode>(() => {
		const stored = localStorage.getItem("themeMode");
		if (stored === "light" || stored === "dark") return stored;
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	});

	useEffect(() => {
		localStorage.setItem("themeMode", mode);
	}, [mode]);

	const toggleMode = useCallback(() => {
		setMode((prev) => (prev === "dark" ? "light" : "dark"));
	}, []);

	const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

	return (
		<ThemeModeContext.Provider value={value}>
			{children}
		</ThemeModeContext.Provider>
	);
}

export function useThemeMode() {
	return useContext(ThemeModeContext);
}
