import {
  index,
  integer,
  primaryKey,
  pgTable as table,
  text,
  timestamp,
  serial,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// From exports/plugins
export * from "../twitter/schema";

// Reusable timestamp columns
const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
};

export const SubmissionStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

// Feeds Table
// Builds according to feeds in curate.config.json
export const feeds = table("feeds", {
  id: text("id").primaryKey(), // (hashtag)
  name: text("name").notNull(),
  description: text("description"),
  ...timestamps,
});

export const submissions = table(
  "submissions",
  {
    tweetId: text("tweet_id").primaryKey(),
    userId: text("user_id").notNull(), // Original tweet author
    username: text("username").notNull(), // Original tweet author
    curatorId: text("curator_id").notNull(), // Who submitted it
    curatorUsername: text("curator_username").notNull(),
    curatorTweetId: text("curator_tweet_id").notNull(), // The tweet where they submitted it
    content: text("content").notNull(), // Original tweet content
    curatorNotes: text("curator_notes"),
    submittedAt: text("submitted_at"),
    ...timestamps,
  },
  (submissions) => [
    index("submissions_user_id_idx").on(submissions.userId),
    index("submissions_submitted_at_idx").on(submissions.submittedAt),
  ],
);

export const submissionFeeds = table(
  "submission_feeds",
  {
    submissionId: text("submission_id")
      .notNull()
      .references(() => submissions.tweetId, { onDelete: "cascade" }),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    status: text("status")
      .notNull()
      .$type<SubmissionStatus>()
      .default(SubmissionStatus.PENDING),
    moderationResponseTweetId: text("moderation_response_tweet_id"),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.submissionId, table.feedId] }),
    index("submission_feeds_feed_idx").on(table.feedId),
  ],
);

export const moderationHistory = table(
  "moderation_history",
  {
    id: serial("id").primaryKey(),
    tweetId: text("tweet_id")
      .notNull()
      .references(() => submissions.tweetId, { onDelete: "cascade" }),
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    adminId: text("admin_id").notNull(),
    action: text("action").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (table) => [
    index("moderation_history_tweet_idx").on(table.tweetId),
    index("moderation_history_admin_idx").on(table.adminId),
    index("moderation_history_feed_idx").on(table.feedId),
  ],
);

export const submissionCounts = table(
  "submission_counts",
  {
    userId: text("user_id").primaryKey(),
    count: integer("count").notNull().default(0),
    lastResetDate: timestamp("last_reset_date").notNull(),
    ...timestamps,
  },
  (table) => [index("submission_counts_date_idx").on(table.lastResetDate)],
);

export const feedPlugins = table(
  "feed_plugins",
  {
    feedId: text("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    pluginId: text("plugin_id").notNull(),
    config: text("config").notNull(), // JSON string of plugin-specific config
    ...timestamps,
  },
  (table) => [
    index("feed_plugins_feed_idx").on(table.feedId),
    index("feed_plugins_plugin_idx").on(table.pluginId),
    primaryKey({ columns: [table.feedId, table.pluginId] }), // Ensure one config per plugin per feed
  ],
);

// Scheduler Tables

export const JobType = {
  RECAP: "recap",
  CUSTOM: "custom",
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobStatus = {
  PENDING: "pending",
  RUNNING: "running",
  SUCCESS: "success",
  FAILED: "failed",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

// Scheduled Jobs Table
export const scheduledJobs = table(
  "scheduled_jobs",
  {
    id: text("id").primaryKey(), // e.g., "feed:ethereum:recap"
    name: text("name").notNull(), // Human-readable name
    description: text("description"),
    jobType: text("job_type").notNull().$type<JobType>(), // "recap", "custom", etc.
    feedId: text("feed_id").references(() => feeds.id, { onDelete: "cascade" }), // Associated feed (if applicable)
    schedule: text("schedule").notNull(), // Cron expression or ISO date
    isOneTime: boolean("is_one_time").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    lastRunAt: timestamp("last_run_at"),
    nextRunAt: timestamp("next_run_at"),
    config: jsonb("config").notNull(), // Job-specific configuration
    ...timestamps,
  },
  (table) => [
    index("scheduled_jobs_feed_idx").on(table.feedId),
    index("scheduled_jobs_next_run_idx").on(table.nextRunAt),
  ],
);

// Job Executions Table
export const jobExecutions = table(
  "job_executions",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => scheduledJobs.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),
    status: text("status").notNull().$type<JobStatus>(),
    error: text("error"),
    result: jsonb("result"),
    duration: text("duration"), // In milliseconds
    ...timestamps,
  },
  (table) => [
    index("job_executions_job_idx").on(table.jobId),
    index("job_executions_status_idx").on(table.status),
    index("job_executions_started_idx").on(table.startedAt),
  ],
);

// Scheduler Locks Table (for leader election)
export const schedulerLocks = table(
  "scheduler_locks",
  {
    lockId: text("lock_id").primaryKey(), // e.g., "scheduler_leader"
    nodeId: text("node_id").notNull(), // Unique ID for the node holding the lock
    expiresAt: timestamp("expires_at").notNull(), // When the lock expires
    ...timestamps,
  },
  (table) => [index("scheduler_locks_expires_idx").on(table.expiresAt)],
);
