import { describe, expect, it } from "vitest";
import { flattenJson } from "../src/flattenJson";

describe("flattenJson", () => {
	it("should flatten a simple nested object", () => {
		const input = {
			user: {
				name: "John",
				age: 30,
			},
		};

		const result = flattenJson(input);

		expect(result).toEqual({
			"user.name": "John",
			"user.age": 30,
		});
	});

	it("should flatten deeply nested objects", () => {
		const input = {
			level1: {
				level2: {
					level3: {
						value: "deep",
					},
				},
			},
		};

		const result = flattenJson(input);

		expect(result).toEqual({
			"level1.level2.level3.value": "deep",
		});
	});

	it("should handle objects with multiple properties at different levels", () => {
		const input = {
			app: {
				name: "MyApp",
				version: "1.0.0",
				config: {
					debug: true,
					port: 3000,
				},
			},
		};

		const result = flattenJson(input);

		expect(result).toEqual({
			"app.name": "MyApp",
			"app.version": "1.0.0",
			"app.config.debug": true,
			"app.config.port": 3000,
		});
	});

	it("should preserve arrays as values without flattening them", () => {
		const input = {
			items: ["apple", "banana", "cherry"],
			nested: {
				list: [1, 2, 3],
			},
		};

		const result = flattenJson(input);

		expect(result).toEqual({
			items: ["apple", "banana", "cherry"],
			"nested.list": [1, 2, 3],
		});
	});

	it("should handle empty objects", () => {
		const input = {};
		const result = flattenJson(input);

		expect(result).toEqual({});
	});

	it("should handle objects with primitive values", () => {
		const input = {
			string: "text",
			number: 42,
			boolean: true,
			nullValue: null,
			undefined: undefined,
		};

		const result = flattenJson(input);

		expect(result).toEqual({
			string: "text",
			number: 42,
			boolean: true,
			nullValue: null,
			undefined: undefined,
		});
	});

	it("should handle mixed nested structures", () => {
		const input = {
			user: {
				profile: {
					name: "Alice",
					age: 25,
				},
				settings: {
					theme: "dark",
					notifications: true,
				},
			},
			system: {
				version: "2.0",
			},
		};

		const result = flattenJson(input);

		expect(result).toEqual({
			"user.profile.name": "Alice",
			"user.profile.age": 25,
			"user.settings.theme": "dark",
			"user.settings.notifications": true,
			"system.version": "2.0",
		});
	});

	it("should handle objects with special characters in keys", () => {
		const input = {
			"my-key": {
				sub_key: "value1",
				"another.key": "value2",
			},
		};

		const result = flattenJson(input);

		expect(result).toEqual({
			"my-key.sub_key": "value1",
			"my-key.another.key": "value2",
		});
	});

	it("should not mutate the original object", () => {
		const input = {
			level1: {
				level2: {
					value: "test",
				},
			},
		};

		const original = JSON.parse(JSON.stringify(input));
		flattenJson(input);

		expect(input).toEqual(original);
	});

	it("should handle translation-like nested structures", () => {
		const input = {
			common: {
				buttons: {
					save: "Save",
					cancel: "Cancel",
				},
			},
			errors: {
				notFound: "Not found",
				serverError: "Server error",
			},
		};

		const result = flattenJson(input);

		expect(result).toEqual({
			"common.buttons.save": "Save",
			"common.buttons.cancel": "Cancel",
			"errors.notFound": "Not found",
			"errors.serverError": "Server error",
		});
	});

	it("should handle objects with numeric values", () => {
		const input = {
			stats: {
				strength: 10,
				dexterity: 15,
				constitution: 12,
			},
		};

		const result = flattenJson(input);

		expect(result).toEqual({
			"stats.strength": 10,
			"stats.dexterity": 15,
			"stats.constitution": 12,
		});
	});

	it("should use custom parentKey when provided", () => {
		const input = {
			name: "test",
			value: 123,
		};

		const result = flattenJson(input, "prefix");

		expect(result).toEqual({
			"prefix.name": "test",
			"prefix.value": 123,
		});
	});

	it("should accept custom result accumulator", () => {
		const input = {
			new: "value",
		};

		const existing = {
			"existing.key": "existing value",
		};

		const result = flattenJson(input, "", existing);

		expect(result).toEqual({
			"existing.key": "existing value",
			new: "value",
		});
	});

	it("should handle complex real-world translation structure", () => {
		const input = {
			command: {
				roll: {
					name: "roll",
					description: "Roll dice",
					options: {
						dice: "Dice to roll",
						modifier: "Modifier to add",
					},
				},
			},
		};

		const result = flattenJson(input);

		expect(result).toEqual({
			"command.roll.name": "roll",
			"command.roll.description": "Roll dice",
			"command.roll.options.dice": "Dice to roll",
			"command.roll.options.modifier": "Modifier to add",
		});
	});
});
