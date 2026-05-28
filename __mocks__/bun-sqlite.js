// Mock for bun:sqlite
class Database {
  constructor(path) {
    // In a real implementation, this would open a SQLite database
    // For mocking purposes, we'll just store the path
    this.path = path;
  }

  exec(sql) {
    // Mock implementation - in reality this would execute SQL
    console.log(`Executing SQL: ${sql}`);
  }

  prepare(sql) {
    // Mock implementation
    return {
      get: () => undefined,
      run: () => undefined,
    };
  }

  transaction(fn) {
    return fn;
  }

  close() {
    // Mock implementation
  }
}

module.exports = { Database };