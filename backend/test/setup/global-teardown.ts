import fs from "fs";
import path from "path";

export default async () => {
  console.time("global-teardown");
  
  // Only clean up in CI environment to keep the database for local debugging
  if (process.env.CI) {
    const testDbDir = path.join(process.cwd(), ".db-test");
    const testDbPath = path.join(testDbDir, "test.sqlite");
    
    // Remove test database file if it exists
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
        console.log("Test database file removed");
      } catch (error) {
        console.error("Error removing test database file:", error);
      }
    }
  }
  
  console.timeEnd("global-teardown");
};
