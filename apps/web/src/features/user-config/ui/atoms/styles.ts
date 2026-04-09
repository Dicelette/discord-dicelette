export const SHAKE_KEYFRAMES = {
	"@keyframes shake": {
		"0%, 100%": { transform: "translateX(0)" },
		"20%": { transform: "translateX(-5px)" },
		"40%": { transform: "translateX(5px)" },
		"60%": { transform: "translateX(-3px)" },
		"80%": { transform: "translateX(3px)" },
	},
} as const;
