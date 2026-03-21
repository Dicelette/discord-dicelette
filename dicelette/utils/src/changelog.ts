import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as semver from "semver";

/**
 * Read CHANGELOG.md and return entries more recent than (or equal to) the provided version.
 * @param version - The reference version
 * @param inclusive - If true, include the version itself
 */
export function getChangelogSince(version: string, inclusive = false): string {
	const file = resolve(process.cwd(), "CHANGELOG.md");
	const content = readFileSync(file, "utf8");

	const regex = /^## \[(\d+\.\d+\.\d+)](?:\([^)]+\))?/gm;

	const matches = [...content.matchAll(regex)];
	const entries: { version: string; start: number; end: number }[] = [];

	for (let i = 0; i < matches.length; i++) {
		const start = matches[i].index ?? 0;
		const end =
			i + 1 < matches.length ? (matches[i + 1].index ?? content.length) : content.length;
		entries.push({ end, start, version: matches[i][1] });
	}

	// Inclusive or strict depending on the flag
	const filtered = entries.filter((e) =>
		inclusive ? semver.gte(e.version, version) : semver.gt(e.version, version)
	);

	return filtered.map((e) => content.slice(e.start, e.end).trim()).join("\n\n");
}

/**
 * Returns all versions found in the CHANGELOG.md, sorted in descending order (most recent first).
 */
export function getAllVersions(): string[] {
	const file = resolve(process.cwd(), "CHANGELOG.md");
	const content = readFileSync(file, "utf8");

	const regex = /^## \[(\d+\.\d+\.\d+)](?:\([^)]+\))?/gm;
	const matches = [...content.matchAll(regex)];

	const versions = matches.map((match) => match[1]);
	return versions.sort(semver.rcompare);
}

export function getOptionsVersion(): { name: string; value: string }[] {
	return getAllVersions().map((version) => {
		return {
			name: version,
			value: version,
		};
	});
}

export function splitChangelogByVersion(fullChangelog: string, limit = 4000): string[] {
	const regex = /^## \[(\d+\.\d+\.\d+)](?:\([^)]+\))?/gm;

	const matches = [...fullChangelog.matchAll(regex)];
	if (matches.length === 0) return [fullChangelog]; // aucun titre ? tout en un bloc

	const slices: string[] = [];
	let current = "";

	for (let i = 0; i < matches.length; i++) {
		const start = matches[i].index ?? 0;
		const end =
			i + 1 < matches.length
				? (matches[i + 1].index ?? fullChangelog.length)
				: fullChangelog.length;

		const section = fullChangelog.slice(start, end).trim();

		if (`${current}\n\n${section}`.length > limit) {
			if (current.length > 0) slices.push(current.trim());
			current = section;
		} else {
			current += (current ? "\n\n" : "") + section;
		}
	}

	if (current.length > 0) slices.push(current.trim());

	return slices;
}

export function normalizeChangelogFormat(md: string): string {
	const lines = md.split(/\r?\n/);
	const result: string[] = [];

	let previousLineEmpty = false;
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i].trimEnd();
		if (line.startsWith("### Features")) line = line.replace("Features", "✨ Features");
		else if (line.startsWith("### Bug Fixes"))
			line = line.replace("Bug Fixes", "🐛 Bug Fixes");
		else if (line.match(/^## (\[.*?\]\(.*?\))/g))
			line = line.replace(/^# (\[.*?\]\(.*?\))/g, "## __$1__");
		else if (line === "") {
			if (!previousLineEmpty) previousLineEmpty = true;
			continue;
		}
		result.push(line);
		previousLineEmpty = false;
	}

	return result.join("\n").trim();
}
