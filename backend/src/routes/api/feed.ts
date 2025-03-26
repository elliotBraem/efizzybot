import { db } from "../../services/db";
import { HonoApp } from "../../types/app";
import { serviceUnavailable } from "../../utils/error";
import { logger } from "../../utils/logger";

// Create feed routes
const router = HonoApp();

/**
 * Get all feeds
 */
router.get("/", async (c) => {
  const context = c.get("context");
  return c.json(context.configService.getConfig().feeds);
});

/**
 * Get submissions for a specific feed
 */
router.get("/:feedId", async (c) => {
  const context = c.get("context");
  const feedId = c.req.param("feedId");

  const feed = context.configService.getFeedConfig(feedId);
  if (!feed) {
    return c.notFound();
  }

  return c.json(await db.getSubmissionsByFeed(feedId));
});

/**
 * Process approved submissions for a feed
 */
router.post("/:feedId/process", async (c) => {
  const context = c.get("context");
  const feedId = c.req.param("feedId");

  const feed = context.configService.getFeedConfig(feedId);
  if (!feed) {
    return c.notFound();
  }

  // Get approved submissions for this feed
  const submissions = await db.getSubmissionsByFeed(feedId);
  const approvedSubmissions = submissions.filter(
    (sub) => sub.status === "approved",
  );

  if (approvedSubmissions.length === 0) {
    return c.json({ processed: 0 });
  }

  // Process each submission through stream output
  let processed = 0;
  if (!context.processorService) {
    throw serviceUnavailable("Processor");
  }

  for (const submission of approvedSubmissions) {
    try {
      if (feed.outputs.stream) {
        await context.processorService.process(submission, feed.outputs.stream);
        processed++;
      }
    } catch (error) {
      logger.error(`Error processing submission ${submission.tweetId}:`, error);
    }
  }

  return c.json({ processed });
});

/**
 * Process a recap for a feed
 */
router.post("/:feedId/recap", async (c) => {
  const context = c.get("context");
  const feedId = c.req.param("feedId");
  
  const feed = context.configService.getFeedConfig(feedId);
  if (!feed || !feed.outputs.recap?.enabled) {
    return c.notFound();
  }
  
  // Get approved submissions for this feed
  const submissions = await db.getSubmissionsByFeed(feedId);
  const approvedSubmissions = submissions.filter(
    (sub) => sub.status === "approved",
  );
  
  if (approvedSubmissions.length === 0) {
    return c.json({ processed: 0 });
  }
  
  // Process batch for recap
  if (!context.processorService) {
    throw serviceUnavailable("Processor");
  }
  
  try {
    await context.processorService.processBatch(
      approvedSubmissions, 
      feed.outputs.recap
    );
    
    return c.json({ 
      processed: approvedSubmissions.length,
      feedId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`Error processing recap for feed ${feedId}:`, error);
    return c.json({ 
      error: `Failed to process recap: ${error.message || String(error)}`,
      feedId,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

export default router;
