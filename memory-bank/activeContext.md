# Active Context

## Current Focus
Platform Stability, Database Migration, Turborepo Conversion, and Feature Enhancement

### Background
- Successfully operating with Node.js/Hono backend
- Using pnpm for package management with Bun for scripts and tests
- Plugin system fully operational with multiple distributors and transformers
- Multiple active feeds with Twitter-based curation

### Next Phase
1. **Platform Stability**
   - Monitoring system performance
   - Ensuring reliable content processing
   - Maintaining plugin compatibility
   - Optimizing resource usage

2. **Database Migration**
   - Migrating from SQLite to PostgreSQL with Drizzle ORM ✓
   - Implementing Docker-based development environment ✓
   - Creating data migration scripts ✓
   - Setting up testing infrastructure with isolated test databases ✓

3. **Turborepo Conversion** ✓
   - Configuring proper workspace support for Bun ✓
   - Implementing Corepack for package manager versioning ✓
   - Optimizing Turborepo configuration for better caching ✓
   - Setting up integration testing for backend services ✓
   - Improving Docker configuration for Turborepo ✓
   - Implementing CI/CD with GitHub Actions ✓

4. **Feature Enhancement**
   - Expanding distributor plugins
   - Improving transformation capabilities
   - Enhancing curator experience
   - Implementing recap functionality with scheduled cron jobs
   - Developing database-driven job scheduling system

5. **Documentation Maintenance**
   - Keeping API documentation current
   - Updating plugin development guides
   - Maintaining deployment documentation
   - Documenting configuration options

### Key Considerations
- Ensuring reliable content processing
- Supporting growing number of feeds
- Maintaining plugin compatibility
- Balancing performance and features
- **JSON sanitization throughout transformation pipeline**
- **Database scalability and performance with PostgreSQL**
- **Consistent development environment with Docker**
- **Optimized build and development workflow with Turborepo**
- **Integration testing for backend services with Docker**
- **Automated testing with GitHub Actions**
- **Reliable scheduling for recap functionality**
- **Database-driven job management for future UI integration**

## Active Decisions

### Architecture
1. Node.js/Hono in production
   - Stable and reliable
   - Good performance characteristics
   - Native module compatibility
2. pnpm for package management with Bun for scripts and tests
   - Fast package management
   - Excellent developer experience
   - Strong workspace support
   - Managed via Corepack for version consistency
3. **PostgreSQL with Drizzle ORM**
   - Improved scalability over SQLite
   - Read/write separation capability
   - Transaction support with retry logic
   - Docker-based development environment
4. **Improved Backend Organization**
   - Modular route structure
   - Dedicated utility for secure file serving
   - Path traversal protection
   - Proper MIME type handling
5. **Turborepo for Monorepo Management**
   - Optimized task execution and caching
   - Workspace-aware dependency management
   - Improved development workflow
   - Integration testing infrastructure
6. **Integrated Scheduler for Recap Jobs**
   - Database-driven job management
   - Leader election for distributed scheduling
   - Support for both recurring and one-time jobs
   - API endpoints for job management
   - Designed for future UI integration

### Plugin System
- Runtime module federation for plugins
- Type-safe plugin configuration
- Hot-reloading support
- Standardized interfaces for different plugin types

### Content Flow
- Twitter as primary content source
- Trusted curator moderation
- Configurable transformation pipeline
- Multi-channel distribution
- Scheduled recap generation

## Current Focus Areas
1. System reliability and performance
2. Database migration to PostgreSQL
3. ~~Turborepo conversion and optimization~~ ✓
4. ~~Integration testing implementation~~ ✓
5. Plugin ecosystem expansion
6. Curator experience improvement
7. Documentation maintenance
8. **Implementing scheduler for recap functionality**

## Next Steps
1. ~~Complete Turborepo conversion~~ ✓
2. Complete PostgreSQL migration
3. ~~Implement integration testing for backend services~~ ✓
4. ~~Optimize Docker configuration for production~~ ✓
5. Implement scheduler service for recap functionality
   - Create database schema for job tracking
   - Implement leader election for distributed scheduling
   - Build API endpoints for job management
   - Integrate with existing recap configuration
6. Expand distributor options
7. Improve transformation capabilities
8. Optimize resource usage

## Validated Solutions
1. Twitter-based submission and moderation
2. Plugin-based architecture
3. Configuration-driven feed management
4. Multi-channel content distribution
5. **Secure static file serving with proper MIME types**
6. **JSON sanitization at key points in the transformation pipeline**

## Testing Strategy Overhaul

### Current Testing Issues
- Over-reliance on mocks instead of component-level testing
- Using fake databases instead of real ones in Docker containers
- Inconsistent test data management
- Limited HTTP integration testing
- Insufficient message queue testing
- Hidden mocks that make tests harder to understand

### Testing Approach Decision
- **Complete refactoring implemented** - The testing approach has been overhauled
- Focus on component tests as primary testing strategy
- Using Docker-Compose for real database and infrastructure
- Implementing a fake MQ for message queue testing
- Clear directory structure for different test types
- Following Node.js testing best practices as documented in memory-bank/testingPlan.md

### Implementation Priority
1. Set up Docker-Compose for testing infrastructure ✓
2. Create a fake MQ implementation ✓
3. Refactor existing tests to use real database ✓
4. Add component tests for key flows ✓
5. Add integration tests for external services ✓
6. Add E2E tests for full flows ✓
