import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export default async () => {
  console.time("global-setup");

  // Create test database directory if it doesn't exist
  const testDbDir = path.join(process.cwd(), ".db-test");
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }

  // Set environment variable for test database
  process.env.DATABASE_URL = `file:${path.join(testDbDir, "test.sqlite")}`;
  
  // Run migrations to set up the schema
  try {
    execSync("bun run db:migrate");
    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
  }

  console.timeEnd("global-setup");
};
