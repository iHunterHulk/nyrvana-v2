import { db } from "./index";
import { readdir } from "fs/promises";
import { join } from "path";

// Create migrations table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )
`);

async function runMigrations() {
  const migrationsDir = join(import.meta.dir, "migrations");
  const files = await readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

  for (const file of sqlFiles) {
    const migrationId = file.replace(".sql", "");
    const applied = db
      .prepare("SELECT 1 FROM _migrations WHERE id = ?")
      .get(migrationId);

    if (!applied) {
      console.log(`Applying migration: ${file}`);
      const sql = await Bun.file(join(migrationsDir, file)).text();
      db.transaction(() => {
        db.exec(sql);
        db.prepare(
          "INSERT INTO _migrations (id, applied_at) VALUES (?, ?)"
        ).run(migrationId, Date.now());
      })();
    }
  }
}

if (import.meta.main) {
  runMigrations().then(() => {
    console.log("Migrations complete");
    db.close();
  });
}

export { runMigrations };