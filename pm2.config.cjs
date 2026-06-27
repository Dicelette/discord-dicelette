module.exports = {
	apps: [
		{
			name: "dicelette",
			script: "dist/apps/bot/index.js",
			node_args: "--max-old-space-size=1024",
			max_memory_restart: "900M",
			log_date_format: "YYYY-MM-DD HH:mm Z",
			interpreter: "node",
			env: {
				NODE_OPTIONS: "--max-old-space-size=1024",
			},
		},
	],
};
