import { describe, expect, it } from "vitest";
import {
	InvalidCsvContent,
	InvalidURL,
	NoChannel,
	NoEmbed,
	TotalExceededError,
} from "../src/errors";

describe("NoEmbed", () => {
	it("should create NoEmbed error with correct name", () => {
		const error = new NoEmbed();

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("NoEmbed");
		expect(error.message).toBe("");
	});

	it("should be throwable", () => {
		expect(() => {
			throw new NoEmbed();
		}).toThrow(NoEmbed);
	});
});

describe("InvalidCsvContent", () => {
	it("should create InvalidCsvContent error without file", () => {
		const error = new InvalidCsvContent();

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("InvalidCsvContent");
		expect(error.file).toBeUndefined();
	});

	it("should create InvalidCsvContent error with file", () => {
		const filename = "data.csv";
		const error = new InvalidCsvContent(filename);

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("InvalidCsvContent");
		expect(error.file).toBe(filename);
	});

	it("should be throwable", () => {
		expect(() => {
			throw new InvalidCsvContent("test.csv");
		}).toThrow(InvalidCsvContent);
	});
});

describe("InvalidURL", () => {
	it("should create InvalidURL error without URL", () => {
		const error = new InvalidURL();

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("InvalidURL");
	});

	it("should create InvalidURL error with URL message", () => {
		const url = "https://invalid-url.com";
		const error = new InvalidURL(url);

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("InvalidURL");
		expect(error.message).toBe(url);
	});

	it("should be throwable", () => {
		expect(() => {
			throw new InvalidURL("https://example.com");
		}).toThrow(InvalidURL);
	});
});

describe("NoChannel", () => {
	it("should create NoChannel error with correct name", () => {
		const error = new NoChannel();

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("NoChannel");
		expect(error.message).toBe("");
	});

	it("should be throwable", () => {
		expect(() => {
			throw new NoChannel();
		}).toThrow(NoChannel);
	});
});

describe("TotalExceededError", () => {
	it("should create TotalExceededError with all properties", () => {
		const message = "Total exceeded maximum value";
		const statName = "strength";
		const exceeded = 5;

		const error = new TotalExceededError(message, statName, exceeded);

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("TotalExceededError");
		expect(error.message).toBe(message);
		expect(error.statName).toBe(statName);
		expect(error.exceeded).toBe(exceeded);
	});

	it("should be throwable and catchable", () => {
		const thrower = () => {
			throw new TotalExceededError("Exceeded", "dexterity", 10);
		};

		expect(thrower).toThrow(TotalExceededError);

		try {
			thrower();
		} catch (error) {
			if (error instanceof TotalExceededError) {
				expect(error.statName).toBe("dexterity");
				expect(error.exceeded).toBe(10);
			}
		}
	});

	it("should handle different stat names and exceeded values", () => {
		const tests = [
			{ exceeded: 3, message: "Error 1", statName: "intelligence" },
			{ exceeded: 15, message: "Error 2", statName: "wisdom" },
			{ exceeded: 0, message: "Error 3", statName: "charisma" },
		];

		for (const { message, statName, exceeded } of tests) {
			const error = new TotalExceededError(message, statName, exceeded);
			expect(error.message).toBe(message);
			expect(error.statName).toBe(statName);
			expect(error.exceeded).toBe(exceeded);
		}
	});
});

describe("Error inheritance", () => {
	it("should all inherit from Error", () => {
		expect(new NoEmbed()).toBeInstanceOf(Error);
		expect(new InvalidCsvContent()).toBeInstanceOf(Error);
		expect(new InvalidURL()).toBeInstanceOf(Error);
		expect(new NoChannel()).toBeInstanceOf(Error);
		expect(new TotalExceededError("msg", "stat", 1)).toBeInstanceOf(Error);
	});

	it("should be distinguishable using instanceof", () => {
		const noEmbed = new NoEmbed();
		const invalidCsv = new InvalidCsvContent();
		const invalidUrl = new InvalidURL();
		const noChannel = new NoChannel();
		const exceeded = new TotalExceededError("msg", "stat", 1);

		expect(noEmbed).toBeInstanceOf(NoEmbed);
		expect(noEmbed).not.toBeInstanceOf(InvalidCsvContent);

		expect(invalidCsv).toBeInstanceOf(InvalidCsvContent);
		expect(invalidCsv).not.toBeInstanceOf(InvalidURL);

		expect(invalidUrl).toBeInstanceOf(InvalidURL);
		expect(invalidUrl).not.toBeInstanceOf(NoChannel);

		expect(noChannel).toBeInstanceOf(NoChannel);
		expect(noChannel).not.toBeInstanceOf(TotalExceededError);

		expect(exceeded).toBeInstanceOf(TotalExceededError);
		expect(exceeded).not.toBeInstanceOf(NoEmbed);
	});
});
