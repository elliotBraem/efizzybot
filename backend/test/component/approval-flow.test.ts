import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "bun:test";
import nock from "nock";
import { createTestClient } from "../utils/test-client";
import {
  createMockTweet,
  createMockCuratorTweet,
  createMockModeratorTweet,
} from "../utils/test-data";
import {
  setupTestServer,
  cleanupTestServer,
  setupDefaultTwitterMocks,
} from "../utils/test-helpers";

describe("Approval Flow", () => {
  let apiClient;
  let server;

  beforeAll(async () => {
    // Initialize the server with a random port for testing
    const testSetup = await setupTestServer();
    server = testSetup.server;
    apiClient = testSetup.apiClient;

    // Disable external network requests
    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");
  });

  afterAll(async () => {
    await cleanupTestServer(server);
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();
    setupDefaultTwitterMocks();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("When a moderator approves a submission, it should be processed and distributed", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    // Mock Twitter API for the original tweet
    nock("https://api.twitter.com")
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);

    // Submit the tweet
    await apiClient.post("/api/twitter/mention", {
      tweet: curatorTweet,
    });

    // Mock the moderator list
    nock("http://localhost")
      .get(/\/api\/feed\/.*\/moderators/)
      .reply(200, {
        moderators: [
          {
            userId: "moderator_id",
            username: "moderator",
          },
        ],
      });

    // Mock distribution service
    nock("http://localhost")
      .post("/api/distribution")
      .reply(200, { success: true });

    // Create a moderator tweet for approval
    const moderatorTweet = createMockModeratorTweet(curatorTweet.id, "approve");

    // Act
    const response = await apiClient.post("/api/twitter/mention", {
      tweet: moderatorTweet,
    });

    // Assert
    expect(response.status).toBe(200);

    // Verify the submission was approved
    const submissionResponse = await apiClient.get(
      `/api/submission/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "approved",
    });
  });

  test("When a moderator rejects a submission, it should be marked as rejected", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    // Mock Twitter API for the original tweet
    nock("https://api.twitter.com")
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);

    // Submit the tweet
    await apiClient.post("/api/twitter/mention", {
      tweet: curatorTweet,
    });

    // Mock the moderator list
    nock("http://localhost")
      .get(/\/api\/feed\/.*\/moderators/)
      .reply(200, {
        moderators: [
          {
            userId: "moderator_id",
            username: "moderator",
          },
        ],
      });

    // Create a moderator tweet for rejection
    const moderatorTweet = createMockModeratorTweet(curatorTweet.id, "reject");

    // Act
    const response = await apiClient.post("/api/twitter/mention", {
      tweet: moderatorTweet,
    });

    // Assert
    expect(response.status).toBe(200);

    // Verify the submission was rejected
    const submissionResponse = await apiClient.get(
      `/api/submission/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "rejected",
    });
  });

  test("When a non-moderator tries to approve a submission, it should be ignored", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    // Mock Twitter API for the original tweet
    nock("https://api.twitter.com")
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);

    // Submit the tweet
    await apiClient.post("/api/twitter/mention", {
      tweet: curatorTweet,
    });

    // Mock the moderator list to return empty (non-moderator)
    nock("http://localhost")
      .get(/\/api\/feed\/.*\/moderators/)
      .reply(200, {
        moderators: [],
      });

    // Create a non-moderator tweet for approval
    const nonModeratorTweet = {
      ...createMockModeratorTweet(curatorTweet.id, "approve"),
      username: "non_moderator",
      userId: "non_moderator_id",
    };

    // Act
    const response = await apiClient.post("/api/twitter/mention", {
      tweet: nonModeratorTweet,
    });

    // Assert
    expect(response.status).toBe(200);

    // Verify the submission was not approved (still pending)
    const submissionResponse = await apiClient.get(
      `/api/submission/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "pending", // Still pending, not approved
    });
  });
});
