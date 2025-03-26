-- Create scheduler tables

-- Job Types Enum
DO $$ BEGIN
    CREATE TYPE job_type AS ENUM ('recap', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Job Status Enum
DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'running', 'success', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Scheduled Jobs Table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    job_type job_type NOT NULL,
    feed_id TEXT REFERENCES feeds(id) ON DELETE CASCADE,
    schedule TEXT NOT NULL,
    is_one_time BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    config JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scheduled_jobs_feed_idx ON scheduled_jobs(feed_id);
CREATE INDEX IF NOT EXISTS scheduled_jobs_next_run_idx ON scheduled_jobs(next_run_at);

-- Job Executions Table
CREATE TABLE IF NOT EXISTS job_executions (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status job_status NOT NULL,
    error TEXT,
    result JSONB,
    duration TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_executions_job_idx ON job_executions(job_id);
CREATE INDEX IF NOT EXISTS job_executions_status_idx ON job_executions(status);
CREATE INDEX IF NOT EXISTS job_executions_started_idx ON job_executions(started_at);

-- Scheduler Locks Table (for leader election)
CREATE TABLE IF NOT EXISTS scheduler_locks (
    lock_id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scheduler_locks_expires_idx ON scheduler_locks(expires_at);
