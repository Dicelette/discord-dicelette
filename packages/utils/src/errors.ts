export class NoEmbed extends Error {
	constructor() {
		super();
		this.name = "NoEmbed";
	}
}

export class InvalidCsvContent extends Error {
	file?: string;
	constructor(file?: string) {
		super();
		this.name = "InvalidCsvContent";
		this.file = file;
	}
}

export class InvalidURL extends Error {
	constructor(url?: string) {
		super(url);
		this.name = "InvalidURL";
	}
}

export class NoChannel extends Error {
	constructor() {
		super();
		this.name = "NoChannel";
	}
}

export class TotalExceededError extends Error {
	exceeded: number;
	statName: string;

	constructor(message: string, statName: string, exceeded: number) {
		super(message);
		this.name = "TotalExceededError";
		this.statName = statName;
		this.exceeded = exceeded;
	}
}

export enum BotErrorLevel {
	Info = 0,
	Warning = 1,
	Error = 2,
	Critical = 3,
	Fatal = 4,
}

export type BotErrorOptions = {
	cause?: string;
	level?: BotErrorLevel;
	code?: string;
};

export class BotError extends Error {
	cause?: string;
	level?: BotErrorLevel;
	code?: string;
	constructor(message: string, options?: BotErrorOptions) {
		super(message);
		this.name = "BotError";
		if (options?.cause) this.cause = options.cause;
		if (options?.level) this.level = options.level;
		if (options?.code) this.code = options.code;
	}
}
