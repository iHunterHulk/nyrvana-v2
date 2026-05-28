import { Database } from "bun:sqlite";
import { dirname } from "path";
import { mkdirSync } from "fs";

const dbPath = process.env['NYRVANA_DB_PATH'] || "./data/nyrvana.db";

mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

export { db };
