import { and, eq, sql, desc, lt, gt, or, isNull, not } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  scheduledJobs,
  jobExecutions,
  schedulerLocks,
  JobStatus,
  JobType,
} from "../db/schema";

/**
 * Get all scheduled jobs
 */
export async function getScheduledJobs(
  db: NodePgDatabase<any>,
  options: {
    enabled?: boolean;
    jobType?: JobType;
    feedId?: string;
  } = {},
) {
  let query = db.select().from(scheduledJobs);

  // Apply filters
  if (options.enabled !== undefined) {
    query = query.where(eq(scheduledJobs.enabled, options.enabled));
  }

  if (options.jobType) {
    query = query.where(eq(scheduledJobs.jobType, options.jobType));
  }

  if (options.feedId) {
    query = query.where(eq(scheduledJobs.feedId, options.feedId));
  }

  const results = await query.orderBy(scheduledJobs.createdAt);
  return results;
}

/**
 * Get scheduled jobs that are due to run
 */
export async function getDueJobs(db: NodePgDatabase<any>) {
  const now = new Date();
  const results = await db
    .select()
    .from(scheduledJobs)
    .where(
      and(
        eq(scheduledJobs.enabled, true),
        or(lt(scheduledJobs.nextRunAt, now), eq(scheduledJobs.nextRunAt, now)),
        // Check that nextRunAt is not null
        not(isNull(scheduledJobs.nextRunAt)),
      ),
    );

  return results;
}

/**
 * Get a specific scheduled job by ID
 */
export async function getScheduledJob(db: NodePgDatabase<any>, id: string) {
  const results = await db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.id, id));

  return results.length > 0 ? results[0] : null;
}

/**
 * Create a new scheduled job
 */
export async function createScheduledJob(
  db: NodePgDatabase<any>,
  job: {
    id: string;
    name: string;
    description?: string;
    jobType: JobType;
    feedId?: string;
    schedule: string;
    isOneTime: boolean;
    enabled: boolean;
    nextRunAt?: Date;
    config: any;
  },
) {
  return await db.insert(scheduledJobs).values(job).returning();
}

/**
 * Update a scheduled job
 */
export async function updateScheduledJob(
  db: NodePgDatabase<any>,
  id: string,
  job: Partial<{
    name: string;
    description: string;
    jobType: JobType;
    feedId: string;
    schedule: string;
    isOneTime: boolean;
    enabled: boolean;
    lastRunAt: Date;
    nextRunAt: Date;
    config: any;
  }>,
) {
  return await db
    .update(scheduledJobs)
    .set({
      ...job,
      updatedAt: new Date(),
    })
    .where(eq(scheduledJobs.id, id))
    .returning();
}

/**
 * Delete a scheduled job
 */
export async function deleteScheduledJob(db: NodePgDatabase<any>, id: string) {
  return await db
    .delete(scheduledJobs)
    .where(eq(scheduledJobs.id, id))
    .returning();
}

/**
 * Get job executions for a specific job
 */
export async function getJobExecutions(
  db: NodePgDatabase<any>,
  jobId: string,
  limit = 10,
) {
  return await db
    .select()
    .from(jobExecutions)
    .where(eq(jobExecutions.jobId, jobId))
    .orderBy(desc(jobExecutions.startedAt))
    .limit(limit);
}

/**
 * Create a job execution record
 */
export async function createJobExecution(
  db: NodePgDatabase<any>,
  execution: {
    id: string;
    jobId: string;
    startedAt: Date;
    status: JobStatus;
    error?: string;
    result?: any;
  },
) {
  return await db.insert(jobExecutions).values(execution).returning();
}

/**
 * Update a job execution record
 */
export async function updateJobExecution(
  db: NodePgDatabase<any>,
  id: string,
  execution: Partial<{
    completedAt: Date;
    status: JobStatus;
    error: string;
    result: any;
    duration: string;
  }>,
) {
  return await db
    .update(jobExecutions)
    .set(execution)
    .where(eq(jobExecutions.id, id))
    .returning();
}

/**
 * Acquire a leader lock for distributed scheduling
 */
export async function acquireLeaderLock(
  db: NodePgDatabase<any>,
  lockId: string,
  nodeId: string,
  ttlMs: number,
): Promise<boolean> {
  const now = Date.now();
  const expiry = new Date(now + ttlMs);

  try {
    // Try to insert or update the lock
    const result = await db.execute(sql`
      INSERT INTO scheduler_locks (lock_id, node_id, expires_at)
      VALUES (${lockId}, ${nodeId}, ${expiry})
      ON CONFLICT (lock_id)
      DO UPDATE SET
        node_id = EXCLUDED.node_id,
        expires_at = EXCLUDED.expires_at
      WHERE scheduler_locks.expires_at < ${new Date(now)}
      RETURNING *
    `);

    return result.rowCount != null && result.rowCount > 0;
  } catch (error) {
    console.error("Error acquiring leader lock:", error);
    return false;
  }
}

/**
 * Renew a leader lock
 */
export async function renewLeaderLock(
  db: NodePgDatabase<any>,
  lockId: string,
  nodeId: string,
  ttlMs: number,
): Promise<boolean> {
  const expiry = new Date(Date.now() + ttlMs);

  try {
    const result = await db
      .update(schedulerLocks)
      .set({
        expiresAt: expiry,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schedulerLocks.lockId, lockId),
          eq(schedulerLocks.nodeId, nodeId),
        ),
      )
      .returning();

    return result.length > 0;
  } catch (error) {
    console.error("Error renewing leader lock:", error);
    return false;
  }
}

/**
 * Release a leader lock
 */
export async function releaseLeaderLock(
  db: NodePgDatabase<any>,
  lockId: string,
  nodeId: string,
): Promise<boolean> {
  try {
    const result = await db
      .delete(schedulerLocks)
      .where(
        and(
          eq(schedulerLocks.lockId, lockId),
          eq(schedulerLocks.nodeId, nodeId),
        ),
      )
      .returning();

    return result.length > 0;
  } catch (error) {
    console.error("Error releasing leader lock:", error);
    return false;
  }
}
