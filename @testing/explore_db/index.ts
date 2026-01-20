import fs from "node:fs";
import path from "node:path";
//@ts-ignore
import type { GuildData } from "@dicelette/types";
import Enmap from "enmap";

const db: Enmap<string, GuildData, unknown> = new Enmap({
	name: "settings",
});

const pathDataRoots = path.join(process.cwd(), "../../data");

if (!fs.existsSync(pathDataRoots)) {
	fs.mkdirSync(pathDataRoots);
}

const sett: Enmap<string, GuildData, unknown> = new Enmap({
	dataDir: pathDataRoots,
	name: "settings",
});

const serv = "453162143668371456";

const oldDb = db.get(serv);
if (oldDb) {
	sett.set(serv, oldDb);
}
