import { nanoid } from 'nanoid';
import { DatabaseService } from '../db';
import { JobStatus, JobType } from '../db/schema';
import { logger } from '../../utils/logger';

/**
 * Database service extension for scheduler-related operations
 */
export class SchedulerDatabase {
  constructor(private db: DatabaseService) {}

  /**
   * Get all scheduled jobs with optional filtering
   */
  async getScheduledJobs(options: {
    enabled?: boolean;
    jobType?: JobType;
    feedId?: string;
  } = {}) {
    // Build the WHERE clause based on options
    const whereConditions = [];
    const params: any[] = [];
    
    if (options.enabled !== undefined) {
      whereConditions.push(`enabled = $${params.length + 1}`);
      params.push(options.enabled);
    }
    
    if (options.jobType) {
      whereConditions.push(`job_type = $${params.length + 1}`);
      params.push(options.jobType);
    }
    
    if (options.feedId) {
      whereConditions.push(`feed_id = $${params.length + 1}`);
      params.push(options.feedId);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    const query = `
      SELECT * FROM scheduled_jobs
      ${whereClause}
      ORDER BY created_at
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, params);
      });
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting scheduled jobs:', error);
      return [];
    }
  }

  /**
   * Get scheduled jobs that are due to run
   */
  async getDueJobs() {
    const now = new Date().toISOString();
    
    const query = `
      SELECT * FROM scheduled_jobs
      WHERE enabled = true
      AND next_run_at IS NOT NULL
      AND (next_run_at <= $1 OR next_run_at = $1)
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, [now]);
      });
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting due jobs:', error);
      return [];
    }
  }

  /**
   * Get a specific scheduled job by ID
   */
  async getScheduledJob(id: string) {
    const query = `
      SELECT * FROM scheduled_jobs
      WHERE id = $1
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, [id]);
      });
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error getting scheduled job ${id}:`, error);
      return null;
    }
  }

  /**
   * Create a new scheduled job
   */
  async createScheduledJob(job: {
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
  }) {
    const query = `
      INSERT INTO scheduled_jobs (
        id, name, description, job_type, feed_id, 
        schedule, is_one_time, enabled, next_run_at, config
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, [
          job.id,
          job.name,
          job.description || null,
          job.jobType,
          job.feedId || null,
          job.schedule,
          job.isOneTime,
          job.enabled,
          job.nextRunAt || null,
          JSON.stringify(job.config)
        ]);
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating scheduled job:', error);
      throw error;
    }
  }

  /**
   * Update a scheduled job
   */
  async updateScheduledJob(
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
    }>
  ) {
    // Build the SET clause dynamically based on provided fields
    const setClauses = [];
    const params: any[] = [id]; // First param is always the ID
    
    if (job.name !== undefined) {
      setClauses.push(`name = $${params.length + 1}`);
      params.push(job.name);
    }
    
    if (job.description !== undefined) {
      setClauses.push(`description = $${params.length + 1}`);
      params.push(job.description);
    }
    
    if (job.jobType !== undefined) {
      setClauses.push(`job_type = $${params.length + 1}`);
      params.push(job.jobType);
    }
    
    if (job.feedId !== undefined) {
      setClauses.push(`feed_id = $${params.length + 1}`);
      params.push(job.feedId);
    }
    
    if (job.schedule !== undefined) {
      setClauses.push(`schedule = $${params.length + 1}`);
      params.push(job.schedule);
    }
    
    if (job.isOneTime !== undefined) {
      setClauses.push(`is_one_time = $${params.length + 1}`);
      params.push(job.isOneTime);
    }
    
    if (job.enabled !== undefined) {
      setClauses.push(`enabled = $${params.length + 1}`);
      params.push(job.enabled);
    }
    
    if (job.lastRunAt !== undefined) {
      setClauses.push(`last_run_at = $${params.length + 1}`);
      params.push(job.lastRunAt);
    }
    
    if (job.nextRunAt !== undefined) {
      setClauses.push(`next_run_at = $${params.length + 1}`);
      params.push(job.nextRunAt);
    }
    
    if (job.config !== undefined) {
      setClauses.push(`config = $${params.length + 1}`);
      params.push(JSON.stringify(job.config));
    }
    
    // Always update the updated_at timestamp
    setClauses.push(`updated_at = NOW()`);
    
    if (setClauses.length === 0) {
      return null; // Nothing to update
    }
    
    const query = `
      UPDATE scheduled_jobs
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, params);
      });
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error updating scheduled job ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a scheduled job
   */
  async deleteScheduledJob(id: string) {
    const query = `
      DELETE FROM scheduled_jobs
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, [id]);
      });
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error deleting scheduled job ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a job execution record
   */
  async createJobExecution(execution: {
    id: string;
    jobId: string;
    startedAt: Date;
    status: JobStatus;
    error?: string;
    result?: any;
  }) {
    const query = `
      INSERT INTO job_executions (
        id, job_id, started_at, status, error, result
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, [
          execution.id,
          execution.jobId,
          execution.startedAt,
          execution.status,
          execution.error || null,
          execution.result ? JSON.stringify(execution.result) : null
        ]);
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating job execution:', error);
      throw error;
    }
  }

  /**
   * Update a job execution record
   */
  async updateJobExecution(
    id: string,
    execution: Partial<{
      completedAt: Date;
      status: JobStatus;
      error: string;
      result: any;
      duration: string;
    }>
  ) {
    // Build the SET clause dynamically based on provided fields
    const setClauses = [];
    const params: any[] = [id]; // First param is always the ID
    
    if (execution.completedAt !== undefined) {
      setClauses.push(`completed_at = $${params.length + 1}`);
      params.push(execution.completedAt);
    }
    
    if (execution.status !== undefined) {
      setClauses.push(`status = $${params.length + 1}`);
      params.push(execution.status);
    }
    
    if (execution.error !== undefined) {
      setClauses.push(`error = $${params.length + 1}`);
      params.push(execution.error);
    }
    
    if (execution.result !== undefined) {
      setClauses.push(`result = $${params.length + 1}`);
      params.push(JSON.stringify(execution.result));
    }
    
    if (execution.duration !== undefined) {
      setClauses.push(`duration = $${params.length + 1}`);
      params.push(execution.duration);
    }
    
    // Always update the updated_at timestamp
    setClauses.push(`updated_at = NOW()`);
    
    if (setClauses.length === 0) {
      return null; // Nothing to update
    }
    
    const query = `
      UPDATE job_executions
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, params);
      });
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error updating job execution ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get job executions for a specific job
   */
  async getJobExecutions(jobId: string, limit = 10) {
    const query = `
      SELECT * FROM job_executions
      WHERE job_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, [jobId, limit]);
      });
      
      return result.rows;
    } catch (error) {
      logger.error(`Error getting job executions for job ${jobId}:`, error);
      return [];
    }
  }

  /**
   * Acquire a leader lock for distributed scheduling
   */
  async acquireLeaderLock(lockId: string, nodeId: string, ttlMs: number): Promise<boolean> {
    const now = new Date();
    const expiry = new Date(now.getTime() + ttlMs);
    
    const query = `
      INSERT INTO scheduler_locks (lock_id, node_id, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (lock_id)
      DO UPDATE SET
        node_id = EXCLUDED.node_id,
        expires_at = EXCLUDED.expires_at
      WHERE scheduler_locks.expires_at < $4
      RETURNING *
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, [lockId, nodeId, expiry, now]);
      });
      
      return result.rowCount != null && result.rowCount > 0;
    } catch (error) {
      logger.error(`Error acquiring leader lock ${lockId}:`, error);
      return false;
    }
  }

  /**
   * Renew a leader lock
   */
  async renewLeaderLock(lockId: string, nodeId: string, ttlMs: number): Promise<boolean> {
    const expiry = new Date(Date.now() + ttlMs);
    
    const query = `
      UPDATE scheduler_locks
      SET expires_at = $3, updated_at = NOW()
      WHERE lock_id = $1 AND node_id = $2
      RETURNING *
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, [lockId, nodeId, expiry]);
      });
      
      return result.rowCount != null && result.rowCount > 0;
    } catch (error) {
      logger.error(`Error renewing leader lock ${lockId}:`, error);
      return false;
    }
  }

  /**
   * Release a leader lock
   */
  async releaseLeaderLock(lockId: string, nodeId: string): Promise<boolean> {
    const query = `
      DELETE FROM scheduler_locks
      WHERE lock_id = $1 AND node_id = $2
      RETURNING *
    `;
    
    try {
      const result = await this.db.transaction(async (client) => {
        return await client.query(query, [lockId, nodeId]);
      });
      
      return result.rowCount != null && result.rowCount > 0;
    } catch (error) {
      logger.error(`Error releasing leader lock ${lockId}:`, error);
      return false;
    }
  }
}
