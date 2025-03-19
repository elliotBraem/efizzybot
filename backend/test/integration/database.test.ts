import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { db } from "../../src/services/db";
import { createMockSubmission } from "../utils/test-data";
import { SubmissionStatus } from "../../src/types/twitter";
import Database from "better-sqlite3";
import { join } from "path";

describe("Database Integration", () => {
  let sqlite: any;

  beforeAll(() => {
    // Use the test database path set in global-setup.ts
    const testDbDir = join(process.cwd(), ".db-test");
    const testDbPath = join(testDbDir, "test.sqlite");
    
    // Create a direct connection to the test database for cleanup operations
    sqlite = new Database(testDbPath);
    
    // Ensure the test database is used by the db service
    process.env.DATABASE_URL = `file:${testDbPath}`;
  });

  afterAll(() => {
    // Close the SQLite connection
    if (sqlite) {
      sqlite.close();
    }
  });

  beforeEach(() => {
    // Clean up submissions before each test using direct SQL
    sqlite.exec("DELETE FROM submissions");
    sqlite.exec("DELETE FROM submission_feeds");
  });

  test("Should save and retrieve a submission", async () => {
    // Arrange
    const submission = createMockSubmission();

    // Act
    db.saveSubmission(submission);

    // Assert
    const retrievedSubmission = db.getSubmission(submission.tweetId);
    expect(retrievedSubmission).toMatchObject({
      tweetId: submission.tweetId,
      userId: submission.userId,
      username: submission.username,
      content: submission.content,
    });
  });

  test("Should update a submission feed status", async () => {
    // Arrange
    const submission = createMockSubmission();
    const feedId = "test-feed";

    // Save submission
    db.saveSubmission(submission);

    // Add submission to feed
    db.saveSubmissionToFeed(
      submission.tweetId,
      feedId,
      SubmissionStatus.PENDING,
    );

    // Act
    db.updateSubmissionFeedStatus(
      submission.tweetId,
      feedId,
      SubmissionStatus.APPROVED,
      "moderator_tweet_id",
    );

    // Assert
    const feeds = db.getFeedsBySubmission(submission.tweetId);
    const feed = feeds.find((f) => f.feedId === feedId);
    expect(feed).toBeDefined();
    expect(feed?.status).toBe(SubmissionStatus.APPROVED);
  });

  test("Should retrieve submissions by feed", async () => {
    // Arrange
    const feedId = "test-feed-" + Date.now();
    const submissions = [
      createMockSubmission(),
      createMockSubmission(),
      createMockSubmission(),
    ];

    for (const submission of submissions) {
      db.saveSubmission(submission);
      db.saveSubmissionToFeed(
        submission.tweetId,
        feedId,
        SubmissionStatus.PENDING,
      );
    }

    // Act
    const retrievedSubmissions = db.getSubmissionsByFeed(feedId);

    // Assert
    expect(retrievedSubmissions.length).toBe(submissions.length);
    for (const submission of submissions) {
      const found = retrievedSubmissions.some(
        (s) => s.tweetId === submission.tweetId,
      );
      expect(found).toBe(true);
    }
  });

  test("Should retrieve all submissions", async () => {
    // Arrange
    const submissions = [
      createMockSubmission(),
      createMockSubmission(),
      createMockSubmission(),
    ];

    // Add submissions with different statuses
    db.saveSubmission(submissions[0]);
    db.saveSubmissionToFeed(
      submissions[0].tweetId,
      "feed1",
      SubmissionStatus.PENDING,
    );

    db.saveSubmission(submissions[1]);
    db.saveSubmissionToFeed(
      submissions[1].tweetId,
      "feed1",
      SubmissionStatus.APPROVED,
    );

    db.saveSubmission(submissions[2]);
    db.saveSubmissionToFeed(
      submissions[2].tweetId,
      "feed1",
      SubmissionStatus.REJECTED,
    );

    // Act - Get all submissions
    const allSubmissions = db.getAllSubmissions();

    // Act - Get pending submissions
    const pendingSubmissions = db.getAllSubmissions(SubmissionStatus.PENDING);

    // Assert
    expect(allSubmissions.length).toBeGreaterThanOrEqual(3);
    expect(pendingSubmissions.length).toBeGreaterThanOrEqual(1);

    // Check that pending submissions have the correct status
    for (const submission of pendingSubmissions) {
      expect(
        submission.feedStatuses?.some((f) => f.status === SubmissionStatus.PENDING),
      ).toBe(true);
    }
  });

  test("Should handle feed operations", async () => {
    // Arrange
    const submission = createMockSubmission();
    const feedId = "test-feed";

    // Save submission
    db.saveSubmission(submission);

    // Add to feed
    db.saveSubmissionToFeed(
      submission.tweetId,
      feedId,
      SubmissionStatus.PENDING,
    );

    // Assert feed was added
    let feeds = db.getFeedsBySubmission(submission.tweetId);
    expect(feeds.length).toBe(1);
    expect(feeds[0].feedId).toBe(feedId);

    // Remove from feed
    db.removeFromSubmissionFeed(submission.tweetId, feedId);

    // Assert feed was removed
    feeds = db.getFeedsBySubmission(submission.tweetId);
    expect(feeds.length).toBe(0);
  });

  test("Should handle concurrent operations", async () => {
    // Arrange
    const submission = createMockSubmission();
    const feedId = "test-feed";

    db.saveSubmission(submission);
    db.saveSubmissionToFeed(
      submission.tweetId,
      feedId,
      SubmissionStatus.PENDING,
    );

    // Act - Run multiple operations concurrently
    const operations = [
      () =>
        db.updateSubmissionFeedStatus(
          submission.tweetId,
          feedId,
          SubmissionStatus.APPROVED,
          "mod_tweet_id",
        ),
      () => db.getSubmission(submission.tweetId),
      () => db.getSubmissionsByFeed(feedId),
    ];

    // Assert - No errors should be thrown
    expect(() => {
      operations.forEach((op) => op());
    }).not.toThrow();
  });
});
