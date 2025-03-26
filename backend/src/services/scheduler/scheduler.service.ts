import { nanoid } from "nanoid";
import { DatabaseService } from "../db";
import { SchedulerDatabase } from "./scheduler.db";
import { JobStatus, JobType } from "../db/schema";
import { logger } from "../../utils/logger";
import { ConfigService } from "../config/config.service";
import { ProcessorService } from "../processor/processor.service";
import { DistributionService } from "../distribution/distribution.service";
import * as cronParser from "cron-parser";
import { FeedConfig, RecapConfig } from "../../types/config";

/**
 * Service for managing scheduled jobs
 */
export class SchedulerService {
  private db: SchedulerDatabase;
  private nodeId: string;
  private leaderLockId = "scheduler-leader";
  private leaderLockTtl = 30000; // 30 seconds
  private leaderCheckInterval: NodeJS.Timer | null = null;
  private jobCheckInterval: NodeJS.Timer | null = null;
  private isLeader = false;
  private isRunning = false;

  constructor(
    dbService: DatabaseService,
    private configService: ConfigService,
    private processorService: ProcessorService,
    private distributionService: DistributionService,
  ) {
    this.db = new SchedulerDatabase(dbService);
    // Generate a unique ID for this node
    this.nodeId = `node-${nanoid(8)}`;
    logger.info(`Scheduler node ID: ${this.nodeId}`);
  }

  /**
   * Start the scheduler service
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info("Starting scheduler service");

    // Start leader election process
    this.startLeaderElection();

    // Start job check interval (all nodes check for jobs, but only leader executes)
    this.startJobCheck();

    // Sync scheduled jobs from config
    await this.syncJobsFromConfig();
  }

  /**
   * Stop the scheduler service
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info("Stopping scheduler service");

    // Clear intervals
    if (this.leaderCheckInterval) {
      clearInterval(this.leaderCheckInterval);
      this.leaderCheckInterval = null;
    }

    if (this.jobCheckInterval) {
      clearInterval(this.jobCheckInterval);
      this.jobCheckInterval = null;
    }

    // Release leader lock if we are the leader
    if (this.isLeader) {
      await this.db.releaseLeaderLock(this.leaderLockId, this.nodeId);
      this.isLeader = false;
    }

    this.isRunning = false;
  }

  /**
   * Start the leader election process
   */
  private startLeaderElection() {
    // Try to acquire leader lock immediately
    this.tryBecomeLeader();

    // Set up interval to check leader status
    this.leaderCheckInterval = setInterval(async () => {
      if (this.isLeader) {
        // If we're the leader, renew the lock
        const renewed = await this.db.renewLeaderLock(
          this.leaderLockId,
          this.nodeId,
          this.leaderLockTtl,
        );

        if (!renewed) {
          logger.warn("Failed to renew leader lock, stepping down as leader");
          this.isLeader = false;
        }
      } else {
        // If we're not the leader, try to become the leader
        this.tryBecomeLeader();
      }
    }, this.leaderLockTtl / 3); // Check more frequently than the TTL
  }

  /**
   * Try to become the leader
   */
  private async tryBecomeLeader() {
    const acquired = await this.db.acquireLeaderLock(
      this.leaderLockId,
      this.nodeId,
      this.leaderLockTtl,
    );

    if (acquired && !this.isLeader) {
      logger.info(`Node ${this.nodeId} became the scheduler leader`);
      this.isLeader = true;
    }
  }

  /**
   * Start the job check interval
   */
  private startJobCheck() {
    // Check for due jobs every minute
    this.jobCheckInterval = setInterval(async () => {
      await this.checkAndExecuteDueJobs();
    }, 60000); // 1 minute

    // Also check immediately on startup
    this.checkAndExecuteDueJobs();
  }

  /**
   * Check for due jobs and execute them
   */
  private async checkAndExecuteDueJobs() {
    if (!this.isLeader) {
      return; // Only the leader executes jobs
    }

    try {
      const dueJobs = await this.db.getDueJobs();

      if (dueJobs.length > 0) {
        logger.info(`Found ${dueJobs.length} due jobs to execute`);

        // Execute each job
        for (const job of dueJobs) {
          this.executeJob(job);
        }
      }
    } catch (error) {
      logger.error("Error checking for due jobs:", error);
    }
  }

  /**
   * Execute a job
   */
  private async executeJob(job: any) {
    logger.info(`Executing job: ${job.name} (${job.id})`);

    // Create execution record
    const executionId = nanoid();
    const startTime = new Date();

    try {
      await this.db.createJobExecution({
        id: executionId,
        jobId: job.id,
        startedAt: startTime,
        status: JobStatus.RUNNING,
      });

      // Execute the job based on its type
      let result;

      switch (job.job_type) {
        case JobType.RECAP:
          result = await this.executeRecapJob(job);
          break;
        // Add other job types here
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Update job execution record
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      await this.db.updateJobExecution(executionId, {
        completedAt: endTime,
        status: JobStatus.SUCCESS,
        result,
        duration: `${durationMs}ms`,
      });

      // Update job's last run time and calculate next run time
      const lastRunAt = new Date();
      let nextRunAt = null;

      if (!job.is_one_time) {
        nextRunAt = this.calculateNextRunTime(job.schedule);
      }

      await this.db.updateScheduledJob(job.id, {
        lastRunAt,
        nextRunAt: nextRunAt || undefined,
        // If it's a one-time job, disable it after execution
        enabled: job.is_one_time ? false : job.enabled,
      });

      logger.info(`Job ${job.name} (${job.id}) completed successfully`);
    } catch (error) {
      logger.error(`Error executing job ${job.name} (${job.id}):`, error);

      // Update job execution record with error
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      await this.db.updateJobExecution(executionId, {
        completedAt: endTime,
        status: JobStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
        duration: `${durationMs}ms`,
      });

      // Still update the job's last run time and next run time
      const lastRunAt = new Date();
      let nextRunAt = null;

      if (!job.is_one_time) {
        nextRunAt = this.calculateNextRunTime(job.schedule);
      }

      await this.db.updateScheduledJob(job.id, {
        lastRunAt,
        nextRunAt: nextRunAt || undefined,
        // If it's a one-time job, disable it after execution even if it failed
        enabled: job.is_one_time ? false : job.enabled,
      });
    }
  }

  /**
   * Execute a recap job
   */
  private async executeRecapJob(job: any) {
    const config = job.config;
    const feedId = job.feed_id;

    if (!feedId) {
      throw new Error("Recap job requires a feed ID");
    }

    // Get the feed configuration
    const feed = await this.configService.getFeedConfig(feedId);

    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    // Check if the feed has a recap output configured
    if (!feed.outputs?.recap?.enabled) {
      throw new Error(`Recap is not enabled for feed: ${feedId}`);
    }

    // Get approved submissions for the feed within the specified time range
    const fromDate = config.fromDate
      ? new Date(config.fromDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 1 week ago

    const toDate = config.toDate ? new Date(config.toDate) : new Date();

    // TODO: Implement the actual recap logic
    // This would involve:
    // 1. Getting approved submissions for the feed within the date range
    // 2. Processing them through the transformation pipeline
    // 3. Distributing the results

    // For now, we'll just return a placeholder result
    return {
      feedId,
      fromDate,
      toDate,
      status: "completed",
      message: "Recap job executed successfully",
    };
  }

  /**
   * Calculate the next run time based on a cron schedule
   */
  private calculateNextRunTime(cronExpression: string): Date | null {
    try {
      const interval = cronParser.parseExpression(cronExpression);
      return interval.next().toDate();
    } catch (error) {
      logger.error(`Error parsing cron expression: ${cronExpression}`, error);
      return null;
    }
  }

  /**
   * Sync scheduled jobs from config
   */
  private async syncJobsFromConfig() {
    try {
      const config = await this.configService.getConfig();

      if (!config || !config.feeds) {
        return;
      }

      // Process each feed
      for (const feed of config.feeds) {
        await this.syncFeedJobs(feed);
      }

      logger.info("Synced scheduled jobs from config");
    } catch (error) {
      logger.error("Error syncing jobs from config:", error);
    }
  }

  /**
   * Sync jobs for a specific feed
   */
  private async syncFeedJobs(feed: FeedConfig) {
    // Check if the feed has a recap output configured
    if (feed.outputs?.recap?.enabled) {
      await this.syncRecapJob(feed);
    }

    // Add other job types here as needed
  }

  /**
   * Sync recap job for a feed
   */
  private async syncRecapJob(feed: FeedConfig) {
    const recapOutput = feed.outputs?.recap;

    if (!recapOutput || !recapOutput.enabled) {
      return;
    }

    // Check if a recap job already exists for this feed
    const existingJobs = await this.db.getScheduledJobs({
      jobType: JobType.RECAP,
      feedId: feed.id,
    });

    const jobName = `${feed.name} Recap`;
    const jobConfig = {
      transformations: recapOutput.transform || [],
      distributions: recapOutput.distribute || [],
      // Default to weekly recap if not specified
      schedule: recapOutput.schedule || "0 0 * * 0", // Every Sunday at midnight
      fromDate: null, // Will be calculated at runtime
      toDate: null, // Will be calculated at runtime
    };

    if (existingJobs.length > 0) {
      // Update existing job
      const existingJob = existingJobs[0];

      await this.db.updateScheduledJob(existingJob.id, {
        name: jobName,
        schedule: jobConfig.schedule,
        enabled: recapOutput.enabled,
        config: jobConfig,
      });

      logger.info(`Updated recap job for feed: ${feed.name}`);
    } else {
      // Create new job
      const jobId = `recap-${feed.id}`;

      await this.db.createScheduledJob({
        id: jobId,
        name: jobName,
        description: `Recap for ${feed.name}`,
        jobType: JobType.RECAP,
        feedId: feed.id,
        schedule: jobConfig.schedule,
        isOneTime: false,
        enabled: recapOutput.enabled,
        nextRunAt: this.calculateNextRunTime(jobConfig.schedule) || undefined,
        config: jobConfig,
      });

      logger.info(`Created recap job for feed: ${feed.name}`);
    }
  }

  /**
   * Get all scheduled jobs
   */
  async getJobs(
    options: {
      enabled?: boolean;
      jobType?: JobType;
      feedId?: string;
    } = {},
  ) {
    return await this.db.getScheduledJobs(options);
  }

  /**
   * Get a specific job by ID
   */
  async getJob(id: string) {
    return await this.db.getScheduledJob(id);
  }

  /**
   * Create a new job
   */
  async createJob(job: {
    name: string;
    description?: string;
    jobType: JobType;
    feedId?: string;
    schedule: string;
    isOneTime: boolean;
    enabled: boolean;
    config: any;
  }) {
    const id = nanoid();
    const nextRunAt = job.enabled
      ? this.calculateNextRunTime(job.schedule)
      : null;

    return await this.db.createScheduledJob({
      id,
      ...job,
      nextRunAt: nextRunAt || undefined,
    });
  }

  /**
   * Update a job
   */
  async updateJob(
    id: string,
    job: Partial<{
      name: string;
      description: string;
      jobType: JobType;
      feedId: string;
      schedule: string;
      isOneTime: boolean;
      enabled: boolean;
      config: any;
    }>,
  ) {
    // If schedule is being updated, recalculate next run time
    let nextRunAt;
    if (job.schedule) {
      const existingJob = await this.db.getScheduledJob(id);
      if (existingJob && existingJob.enabled) {
        nextRunAt = this.calculateNextRunTime(job.schedule);
      }
    }

    // If enabled is being set to true, calculate next run time
    if (job.enabled === true) {
      const existingJob = await this.db.getScheduledJob(id);
      if (existingJob) {
        nextRunAt = this.calculateNextRunTime(existingJob.schedule);
      }
    }

    return await this.db.updateScheduledJob(id, {
      ...job,
      nextRunAt: nextRunAt || undefined,
    });
  }

  /**
   * Delete a job
   */
  async deleteJob(id: string) {
    return await this.db.deleteScheduledJob(id);
  }

  /**
   * Get job executions for a specific job
   */
  async getJobExecutions(jobId: string, limit = 10) {
    return await this.db.getJobExecutions(jobId, limit);
  }

  /**
   * Run a job immediately
   */
  async runJobNow(id: string) {
    const job = await this.db.getScheduledJob(id);

    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    // Execute the job
    await this.executeJob(job);

    return job;
  }
}
