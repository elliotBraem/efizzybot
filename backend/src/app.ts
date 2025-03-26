import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import path from "path";
import { apiRoutes } from "./routes/api";
import { configureStaticRoutes, staticRoutes } from "./routes/static";
import { mockTwitterService } from "./routes/api/test";
import { ConfigService, isProduction } from "./services/config/config.service";
import { ConfigSyncService } from "./services/config/config-sync.service";
import { DistributionService } from "./services/distribution/distribution.service";
import { PluginService } from "./services/plugins/plugin.service";
import { ProcessorService } from "./services/processor/processor.service";
import { SchedulerService } from "./services/scheduler/scheduler.service";
import { SubmissionService } from "./services/submissions/submission.service";
import { TransformationService } from "./services/transformation/transformation.service";
import { TwitterService } from "./services/twitter/client";
import { AppContext, AppInstance, HonoApp } from "./types/app";
import { errorHandler } from "./utils/error";
import { db } from "./services/db";
import { logger } from "./utils/logger";

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173", // Dev server
  "http://localhost:3001", // Local landing page
  "https://curatedotfun-floral-sun-1539.fly.dev",
  "https://www.curate.fun", // Landing page
];

export async function createApp(): Promise<AppInstance> {
  // Initialize services
  const configService = ConfigService.getInstance();
  await configService.loadConfig();

  const pluginService = PluginService.getInstance();
  const distributionService = new DistributionService(pluginService);
  const transformationService = new TransformationService(pluginService);
  const processorService = new ProcessorService(
    transformationService,
    distributionService,
  );

  let twitterService: TwitterService | null = null;
  if (isProduction) {
    twitterService = new TwitterService({
      username: process.env.TWITTER_USERNAME!,
      password: process.env.TWITTER_PASSWORD!,
      email: process.env.TWITTER_EMAIL!,
      twoFactorSecret: process.env.TWITTER_2FA_SECRET,
    });
    await twitterService.initialize();
  } else {
    // use mock service
    twitterService = mockTwitterService;
    await twitterService.initialize();
  }

  const submissionService = twitterService
    ? new SubmissionService(
        twitterService,
        processorService,
        configService.getConfig(),
      )
    : null;

  // Initialize scheduler services
  const configSyncService = new ConfigSyncService(configService, db);
  const schedulerService = new SchedulerService(
    db,
    configService,
    processorService,
    distributionService
  );
  
  // Sync config to database
  try {
    await configSyncService.syncRecapConfigs();
    logger.info("Recap configurations synchronized");
  } catch (error) {
    logger.error("Failed to sync recap configurations:", error);
  }
  
  // Start scheduler service
  try {
    await schedulerService.start();
    logger.info("Scheduler service started");
  } catch (error) {
    logger.error("Failed to start scheduler service:", error);
  }

  const context: AppContext = {
    twitterService,
    submissionService,
    distributionService,
    processorService,
    configService,
    schedulerService,
    configSyncService,
  };

  // Create Hono app
  const app = HonoApp();

  // Set context (make services accessible to routes)
  app.use("*", async (c, next) => {
    c.set("context", context);
    await next();
  });

  // Handle errors
  app.onError((err, c) => {
    return errorHandler(err, c);
  });

  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: ALLOWED_ORIGINS,
      allowMethods: ["GET", "POST"],
    }),
  );

  // UNCOMMENT THIS IF YOU WANT TO SEE REQUESTS
  // import { logger } from "hono/logger";
  // if (!isProduction) app.use("*", logger());

  // Mount API routes
  app.route("/api", apiRoutes);

  // Configure static routes for production
  if (isProduction) {
    const publicDir = path.join(__dirname, "public");
    configureStaticRoutes(publicDir);
    app.route("", staticRoutes);
  }

  return { 
    app, 
    context,
    cleanup: async () => {
      // Cleanup function to stop services when app is shutting down
      if (schedulerService) {
        await schedulerService.stop();
        logger.info("Scheduler service stopped");
      }
    }
  };
}
