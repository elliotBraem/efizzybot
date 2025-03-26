import { Hono } from "hono";
import { ConfigService } from "../services/config/config.service";
import { ConfigSyncService } from "../services/config/config-sync.service";
import { DistributionService } from "../services/distribution/distribution.service";
import { ProcessorService } from "../services/processor/processor.service";
import { SchedulerService } from "../services/scheduler/scheduler.service";
import { SubmissionService } from "../services/submissions/submission.service";
import { TwitterService } from "../services/twitter/client";

/**
 * Application context shared across routes
 */
export interface AppContext {
  twitterService: TwitterService | null;
  submissionService: SubmissionService | null;
  distributionService: DistributionService | null;
  processorService: ProcessorService | null;
  configService: ConfigService;
  schedulerService?: SchedulerService;
  configSyncService?: ConfigSyncService;
}

/**
 * Application instance returned by createApp
 */
export interface AppInstance {
  app: HonoAppType;
  context: AppContext;
  cleanup?: () => Promise<void>;
}

/**
 * Type for Hono app with AppContext
 */
export type HonoAppType = Hono<{
  Variables: {
    context: AppContext;
  };
}>;

/**
 * Factory function to create a new Hono app with AppContext
 */
export const HonoApp = (): HonoAppType => {
  return new Hono<{
    Variables: {
      context: AppContext;
    };
  }>();
};
