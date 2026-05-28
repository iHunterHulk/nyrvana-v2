import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "bun:sqlite";
import { runMigrations } from "./migrate";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("database", () => {
  let dbPath: string;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "nyrvana-test-"));
    dbPath = join(tempDir, "test.db");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should run migrations idempotently", async () => {
    // Set environment variable for this test
    const originalEnv = process.env.NYRVANA_DB_PATH;
    process.env.NYRVANA_DB_PATH = dbPath;

    // Import db module dynamically to use the new env var
    const { db } = await import("./index");
    
    // Run migrations twice
    await runMigrations();
    await runMigrations();

    // Check that tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map((t: any) => t.name);
    expect(tableNames).toContain("users");
    expect(tableNames).toContain("refresh_tokens");
    expect(tableNames).toContain("service_credentials");
    expect(tableNames).toContain("_migrations");

    // Check that foreign keys are enforced
    expect(() => {
      db.prepare("INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
        .run("token123", "nonexistent_user", Date.now() + 86400000, Date.now());
    }).toThrow();

    // Clean up
    // db.close removed - shared singleton, Bun cleans up on exit
    process.env.NYRVANA_DB_PATH = originalEnv;
  });

  it("should have correct schema", async () => {
    const originalEnv = process.env.NYRVANA_DB_PATH;
    process.env.NYRVANA_DB_PATH = dbPath;

    const { db } = await import("./index");
    await runMigrations();

    // Check users table
    const userColumns = db.prepare("PRAGMA table_info(users)").all();
    expect(userColumns).toHaveLength(6);
    expect(userColumns[0].name).toBe("id");
    expect(userColumns[1].name).toBe("email");
    expect(userColumns[2].name).toBe("password_hash");
    expect(userColumns[3].name).toBe("role");
    expect(userColumns[4].name).toBe("created_at");
    expect(userColumns[5].name).toBe("updated_at");

    // Check refresh_tokens table
    const tokenColumns = db.prepare("PRAGMA table_info(refresh_tokens)").all();
    expect(tokenColumns).toHaveLength(5);
    expect(tokenColumns[0].name).toBe("token_hash");
    expect(tokenColumns[1].name).toBe("user_id");
    expect(tokenColumns[2].name).toBe("expires_at");
    expect(tokenColumns[3].name).toBe("revoked_at");
    expect(tokenColumns[4].name).toBe("created_at");

    // Check service_credentials table
    const credColumns = db.prepare("PRAGMA table_info(service_credentials)").all();
    expect(credColumns).toHaveLength(6);
    expect(credColumns[0].name).toBe("user_id");
    expect(credColumns[1].name).toBe("adapter_id");
    expect(credColumns[2].name).toBe("encrypted_blob");
    expect(credColumns[3].name).toBe("iv");
    expect(credColumns[4].name).toBe("auth_tag");
    expect(credColumns[5].name).toBe("updated_at");

    // db.close removed - shared singleton, Bun cleans up on exit
    process.env.NYRVANA_DB_PATH = originalEnv;
  });
});