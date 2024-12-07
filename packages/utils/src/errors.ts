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
