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
import { createMockTweet, createMockCuratorTweet } from "../utils/test-data";
import {
  setupTestServer,
  cleanupTestServer,
  setupDefaultTwitterMocks,
} from "../utils/test-helpers";

describe("Submission Flow", () => {
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

  test("When a tweet is submitted to a feed, it should be saved and pending approval", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    // Mock Twitter API to return the original tweet
    nock("https://api.twitter.com")
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);

    // Act
    const response = await apiClient.post("/api/twitter/mention", {
      tweet: curatorTweet,
    });

    // Assert
    expect(response.status).toBe(200);

    // Verify the submission was saved
    const submissionResponse = await apiClient.get(
      `/api/submission/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "pending",
      feedId: "test-feed",
    });
  });

  test("When a tweet is submitted to multiple feeds, it should be saved to all feeds", async () => {
    // Arrange
    const tweet = createMockTweet();
    const feedIds = ["feed1", "feed2", "feed3"];
    const curatorTweet = createMockCuratorTweet(tweet.id, feedIds);

    // Mock Twitter API
    nock("https://api.twitter.com")
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);

    // Act
    const response = await apiClient.post("/api/twitter/mention", {
      tweet: curatorTweet,
    });

    // Assert
    expect(response.status).toBe(200);

    // Verify submissions were created for each feed
    for (const feedId of feedIds) {
      const submissionsResponse = await apiClient.get(
        `/api/feed/${feedId}/submissions`,
      );
      expect(submissionsResponse.status).toBe(200);

      const submission = submissionsResponse.data.submissions.find(
        (s) => s.tweetId === tweet.id,
      );
      expect(submission).toBeDefined();
      expect(submission.feedId).toBe(feedId);
      expect(submission.status).toBe("pending");
    }
  });

  test("When a tweet is submitted by a moderator, it should be auto-approved", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    // Make the curator a moderator for this test
    nock("http://localhost")
      .get(/\/api\/feed\/.*\/moderators/)
      .reply(200, {
        moderators: [
          {
            userId: curatorTweet.userId,
            username: curatorTweet.username,
          },
        ],
      });

    // Mock Twitter API
    nock("https://api.twitter.com")
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);

    // Act
    const response = await apiClient.post("/api/twitter/mention", {
      tweet: curatorTweet,
    });

    // Assert
    expect(response.status).toBe(200);

    // Verify the submission was auto-approved
    const submissionResponse = await apiClient.get(
      `/api/submission/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "approved",
      feedId: "test-feed",
    });
  });
});
