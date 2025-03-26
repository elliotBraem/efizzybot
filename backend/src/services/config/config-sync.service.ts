import { ConfigService } from "./config.service";
import { nanoid } from "nanoid";
import { parseExpression } from "cron-parser";
import { logger } from "../../utils/logger";
import { DatabaseService } from "../db";
import { JobType } from "../db/schema";
import { SchedulerDatabase } from "../scheduler/scheduler.db";

export class ConfigSyncService {
  private schedulerDb: SchedulerDatabase;
  
  constructor(
    private configService: ConfigService,
    private db: DatabaseService
  ) {
    this.schedulerDb = new SchedulerDatabase(db);
  }
  
  /**
   * Sync recap configurations from config file to database
   */
  async syncRecapConfigs(): Promise<void> {
    const config = this.configService.getConfig();
    
    for (const feed of config.feeds) {
      if (feed.outputs.recap?.enabled && feed.outputs.recap.schedule) {
        const jobId = `recap-${feed.id}`;
        
        // Calculate next run time
        let nextRunAt: Date | undefined = undefined;
        let isOneTime = false;
        
        try {
          // Check if it's a one-time schedule (ISO date)
          isOneTime = this.isIsoDateString(feed.outputs.recap.schedule);
          
          if (isOneTime) {
            nextRunAt = new Date(feed.outputs.recap.schedule);
          } else {
            const interval = parseExpression(feed.outputs.recap.schedule);
            nextRunAt = interval.next().toDate();
          }
          
          // Check if job already exists
          const existingJob = await this.schedulerDb.getScheduledJob(jobId);
          
          const jobConfig = {
            transformations: feed.outputs.recap.transform || [],
            distributions: feed.outputs.recap.distribute || [],
            schedule: feed.outputs.recap.schedule,
            fromDate: null, // Will be calculated at runtime
            toDate: null // Will be calculated at runtime
          };
          
          if (existingJob) {
            // Update existing job
            await this.schedulerDb.updateScheduledJob(jobId, {
              name: `${feed.name} Recap`,
              schedule: feed.outputs.recap.schedule,
              enabled: feed.outputs.recap.enabled,
              nextRunAt,
              config: jobConfig
            });
            
            logger.info(`Updated recap job for feed ${feed.id} with schedule ${feed.outputs.recap.schedule}, next run at ${nextRunAt}`);
          } else {
            // Create new job
            await this.schedulerDb.createScheduledJob({
              id: jobId,
              name: `${feed.name} Recap`,
              description: `Recap for ${feed.name}`,
              jobType: JobType.RECAP,
              feedId: feed.id,
              schedule: feed.outputs.recap.schedule,
              isOneTime,
              enabled: feed.outputs.recap.enabled,
              nextRunAt,
              config: jobConfig
            });
            
            logger.info(`Created recap job for feed ${feed.id} with schedule ${feed.outputs.recap.schedule}, next run at ${nextRunAt}`);
          }
        } catch (error) {
          logger.error(`Error syncing recap job for feed ${feed.id}:`, error);
        }
      }
    }
  }
  
  /**
   * Check if a string is an ISO date
   */
  private isIsoDateString(str: string): boolean {
    try {
      const date = new Date(str);
      return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str);
    } catch {
      return false;
    }
  }
}
