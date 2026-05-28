import { Database } from "bun:sqlite";

const dbPath = process.env['NYRVANA_DB_PATH'] || "./data/nyrvana.db";
const db = new Database(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

export { db };