import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { nanoid } from "nanoid";
import { JobType } from "../../services/db/schema";
import { logger } from "../../utils/logger";

const app = new Hono();

// Get all scheduled jobs
app.get("/", async (c) => {
  const { schedulerService } = c.get("context");
  
  if (!schedulerService) {
    return c.json({ error: "Scheduler service not available" }, 503);
  }
  
  try {
    const jobs = await schedulerService.getJobs();
    return c.json({ jobs });
  } catch (error) {
    logger.error("Error getting scheduled jobs:", error);
    return c.json({ error: "Failed to get scheduled jobs" }, 500);
  }
});

// Get a specific job by ID
app.get("/:id", async (c) => {
  const { schedulerService } = c.get("context");
  const id = c.req.param("id");
  
  if (!schedulerService) {
    return c.json({ error: "Scheduler service not available" }, 503);
  }
  
  try {
    const job = await schedulerService.getJob(id);
    
    if (!job) {
      return c.json({ error: "Job not found" }, 404);
    }
    
    return c.json({ job });
  } catch (error) {
    logger.error(`Error getting job ${id}:`, error);
    return c.json({ error: "Failed to get job" }, 500);
  }
});

// Create a new job
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string(),
      description: z.string().optional(),
      jobType: z.enum([JobType.RECAP]),
      feedId: z.string().optional(),
      schedule: z.string(),
      isOneTime: z.boolean(),
      enabled: z.boolean(),
      config: z.any(),
    })
  ),
  async (c) => {
    const { schedulerService } = c.get("context");
    const body = await c.req.valid("json");
    
    if (!schedulerService) {
      return c.json({ error: "Scheduler service not available" }, 503);
    }
    
    try {
      const job = await schedulerService.createJob(body);
      return c.json({ job }, 201);
    } catch (error) {
      logger.error("Error creating job:", error);
      return c.json({ error: "Failed to create job" }, 500);
    }
  }
);

// Update a job
app.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      jobType: z.enum([JobType.RECAP]).optional(),
      feedId: z.string().optional(),
      schedule: z.string().optional(),
      isOneTime: z.boolean().optional(),
      enabled: z.boolean().optional(),
      config: z.any().optional(),
    })
  ),
  async (c) => {
    const { schedulerService } = c.get("context");
    const id = c.req.param("id");
    const body = await c.req.valid("json");
    
    if (!schedulerService) {
      return c.json({ error: "Scheduler service not available" }, 503);
    }
    
    try {
      const job = await schedulerService.updateJob(id, body);
      
      if (!job) {
        return c.json({ error: "Job not found" }, 404);
      }
      
      return c.json({ job });
    } catch (error) {
      logger.error(`Error updating job ${id}:`, error);
      return c.json({ error: "Failed to update job" }, 500);
    }
  }
);

// Delete a job
app.delete("/:id", async (c) => {
  const { schedulerService } = c.get("context");
  const id = c.req.param("id");
  
  if (!schedulerService) {
    return c.json({ error: "Scheduler service not available" }, 503);
  }
  
  try {
    const job = await schedulerService.deleteJob(id);
    
    if (!job) {
      return c.json({ error: "Job not found" }, 404);
    }
    
    return c.json({ success: true });
  } catch (error) {
    logger.error(`Error deleting job ${id}:`, error);
    return c.json({ error: "Failed to delete job" }, 500);
  }
});

// Get job executions
app.get("/:id/executions", async (c) => {
  const { schedulerService } = c.get("context");
  const id = c.req.param("id");
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")) : 10;
  
  if (!schedulerService) {
    return c.json({ error: "Scheduler service not available" }, 503);
  }
  
  try {
    const executions = await schedulerService.getJobExecutions(id, limit);
    return c.json({ executions });
  } catch (error) {
    logger.error(`Error getting job executions for ${id}:`, error);
    return c.json({ error: "Failed to get job executions" }, 500);
  }
});

// Run a job immediately
app.post("/:id/run", async (c) => {
  const { schedulerService } = c.get("context");
  const id = c.req.param("id");
  
  if (!schedulerService) {
    return c.json({ error: "Scheduler service not available" }, 503);
  }
  
  try {
    const job = await schedulerService.runJobNow(id);
    return c.json({ success: true, job });
  } catch (error) {
    logger.error(`Error running job ${id}:`, error);
    return c.json({ error: "Failed to run job" }, 500);
  }
});

export { app as schedulerRoutes };
