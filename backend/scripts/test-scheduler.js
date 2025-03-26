#!/usr/bin/env node

/**
 * Test script for the scheduler service
 * 
 * This script creates a test job and runs it immediately to verify that the scheduler
 * implementation works correctly.
 * 
 * Usage: node scripts/test-scheduler.js
 */

import { createApp } from '../src/app.js';
import { JobType } from '../src/services/db/schema.js';
import { nanoid } from 'nanoid';
import { logger } from '../src/utils/logger.js';

async function main() {
  logger.info('Starting scheduler test script');
  
  // Create the app
  const { context, cleanup } = await createApp();
  const { schedulerService } = context;
  
  if (!schedulerService) {
    logger.error('Scheduler service not available');
    process.exit(1);
  }
  
  try {
    // Create a test job
    const jobId = `test-job-${nanoid(6)}`;
    const job = {
      name: 'Test Job',
      description: 'A test job created by the test script',
      jobType: JobType.RECAP,
      feedId: 'test-feed',
      schedule: '0 0 * * *', // Run at midnight every day
      isOneTime: false,
      enabled: true,
      config: {
        test: true,
        message: 'This is a test job',
      },
    };
    
    logger.info('Creating test job');
    const createdJob = await schedulerService.createJob(job);
    logger.info(`Created job: ${createdJob.id}`);
    
    // Get the job
    logger.info('Getting job');
    const retrievedJob = await schedulerService.getJob(createdJob.id);
    logger.info(`Retrieved job: ${retrievedJob.id}`);
    
    // Run the job
    logger.info('Running job');
    await schedulerService.runJobNow(createdJob.id);
    logger.info('Job executed');
    
    // Get job executions
    logger.info('Getting job executions');
    const executions = await schedulerService.getJobExecutions(createdJob.id);
    logger.info(`Job executions: ${executions.length}`);
    
    // Delete the job
    logger.info('Deleting job');
    await schedulerService.deleteJob(createdJob.id);
    logger.info('Job deleted');
    
    logger.info('Test completed successfully');
  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    // Clean up
    if (cleanup) {
      await cleanup();
    }
    
    process.exit(0);
  }
}

main().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
