import { useContext } from "react";
import { GuildConfigContext } from "./GuildConfigContext";

export function useGuildConfig() {
	const context = useContext(GuildConfigContext);
	if (!context) {
		throw new Error("useGuildConfig must be used within GuildConfigProvider");
	}
	return context;
}
