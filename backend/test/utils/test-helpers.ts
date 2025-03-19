import nock from "nock";
import { createTestServer } from "./test-server";
import { createTestClient } from "./test-client";

/**
 * Sets up a test server and returns the server and API client
 * @returns An object containing the server and API client
 */
export async function setupTestServer() {
  const testServer = await createTestServer();
  const apiClient = createTestClient(testServer.port);

  return { server: testServer, apiClient };
}

/**
 * Cleans up after tests
 * @param server The server to close
 */
export async function cleanupTestServer(server: any) {
  await server.close();
  nock.cleanAll();
}

/**
 * Sets up default Twitter API mocks
 */
export function setupDefaultTwitterMocks() {
  // Disable external network requests
  nock.disableNetConnect();
  nock.enableNetConnect("127.0.0.1");

  // Set up default Twitter API mocks
  nock("https://api.twitter.com")
    .get(/\/tweets\/.*/)
    .reply(200, (uri) => {
      const tweetId = uri.split("/").pop();
      return {
        id: tweetId,
        text: `Mock tweet ${tweetId}`,
        user: {
          id: "mock_user_id",
          username: "mock_user",
        },
      };
    });
}

/**
 * Waits for a specified amount of time
 * @param ms Time to wait in milliseconds
 * @returns A promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a random string for use in tests
 * @param length Length of the string to generate
 * @returns A random string
 */
export function randomString(length = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}
