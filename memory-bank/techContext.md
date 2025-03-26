# Technical Context

## Technology Stack

### Backend
- **Runtime**: Node.js (production)
- **Framework**: Hono
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM (with DB service abstraction)
- **Build Tool**: RSPack
- **Package Manager**: pnpm (with Corepack)
- **Script Runner**: Bun (for tests and development scripts)

### Frontend
- **Framework**: React 18
- **Router**: TanStack Router
- **State Management**: TanStack Query
- **Build Tool**: RSBuild
- **Styling**: Tailwind CSS

### External Services
- **Twitter API**: Content source and moderation
- **Telegram API**: Content distribution
- **Notion API**: Content distribution
- **NEAR Social**: Content distribution
- **OpenRouter API**: AI transformations

## Development Setup

### Core Dependencies
- Node.js (runtime in production)
- pnpm (package manager)
- Bun (script runner and test runner)
- Corepack (package manager version management)
- TypeScript (5.x+)
- Hono (latest)
- React (18.x)
- TanStack Router & Query
- RSBuild & RSPack
- Tailwind CSS
- Testing Libraries
  * Bun Test
  * Nock (for HTTP mocking)

### Environment Configuration
- Core Settings
  * NODE_ENV
  * PORT
  * LOG_LEVEL
- Database Settings
  * DATABASE_URL
  * DATABASE_WRITE_URL (optional for read/write separation)
  * DATABASE_READ_URL (optional for read/write separation)
- Twitter Auth
  * TWITTER_USERNAME
  * TWITTER_PASSWORD
  * TWITTER_EMAIL
  * TWITTER_2FA_SECRET
- Distribution Settings
  * TELEGRAM_BOT_TOKEN
  * NOTION_API_KEY
  * OPENROUTER_API_KEY
  * SHIPPOST_NEAR_SOCIAL_KEY
- Plugin Settings
  * PLUGIN_CACHE_TTL
  * MAX_PLUGIN_MEMORY

## Plugin System

### Core Plugin Features
- Runtime module federation loading
- Hot-reloading support
- Custom endpoint registration
- Scheduled task integration
- Type-safe configuration

### Distributor Plugins
- Telegram: Real-time message distribution
- RSS: Feed generation
- Notion: Database integration
- NEAR Social: Content posting

### Transformer Plugins
- AI Transform: AI-powered content transformation
- Simple Transform: Basic content formatting
- Object Transform: Data mapping and transformation

### Source Plugins
- Twitter: Tweet monitoring and interaction
- Telegram: Message monitoring (planned)
- LinkedIn: Post monitoring (planned)

### Plugin Development
- Development Tools
  * Plugin development kit
  * Type generation utilities
  * Testing helpers
  * Documentation generators
- Testing Infrastructure
  * Mock system
  * Test runners
  * Fixture generators
  * Performance testing tools
- Development Features
  * Hot-reload support
  * Debug logging
  * State inspection
  * Performance profiling

## Task Scheduling

### Cron Jobs
- Configuration-driven scheduling
- Recap generation tasks
- Plugin-specific scheduled tasks
- Execution monitoring
- Error handling and retries

### Recap System
- Scheduled content aggregation
- Customizable transformation
- Multi-channel distribution
- Configurable schedules (cron syntax)

## Security Considerations

### API Security
- CORS with allowed origins configuration
- Secure headers middleware
- Cross-Origin policies
- Content Security Policy

### Authentication & Authorization
- Twitter-based curator authentication
- Environment-based service authentication
- API endpoint access control

## Deployment

### Requirements
- Node.js environment
- Environment variables configuration
- Plugin dependencies
- Frontend build artifacts

### Infrastructure
- Fly.io deployment
- PostgreSQL database
- Docker-based development environment
- Health check endpoint
- Graceful shutdown handling

### Monitoring
- Health check endpoint
- Service initialization status
- Graceful shutdown handling
- Error logging and recovery

## Development Practices

### Code Organization
- Architecture
  * Service-based design
  * Plugin system
  * Event-driven patterns
  * Clean architecture principles
- Standards
  * TypeScript strict mode
  * ESLint configuration
  * Prettier formatting
  * Import organization
- Component Design
  * Atomic design principles
  * Reusable patterns
  * Performance optimization
  * Error boundaries

### Development Environment
- Docker Compose for local development
- PostgreSQL container with persistent volume
- Automatic migrations on startup
- Seed data scripts
- Hot-reloading for development

### Testing Strategy
- Unit Testing
  * Service tests
  * Component tests
  * Plugin tests
  * Utility tests
- Integration Testing
  * API endpoints
  * Plugin interactions
  * Service integration
  * Event handling
  * Mock submission and distribution testing
  * Backend service mocking
  * Docker-based PostgreSQL testing
- E2E Testing
  * User flows
  * Plugin workflows
  * Distribution paths
  * Error scenarios
- Performance Testing
  * Load testing
  * Stress testing
  * Memory profiling
  * Bottleneck identification
- CI/CD Testing
  * GitHub Actions workflow
  * Docker-based test execution
  * Automated test runs on pull requests and main branch

### Project Structure
- Monorepo with Turborepo
  * Optimized task execution and caching
  * Workspace-aware dependency management
  * pnpm workspace configuration
  * Integration testing setup
- Backend and Frontend as separate workspaces
- Shared types and utilities
- Documentation as a separate package
- GitHub Actions workflows for CI/CD

### Monorepo Configuration
- Turborepo for build orchestration and caching
- pnpm workspaces for dependency management
- Corepack for package manager version consistency
- Optimized Docker configuration for monorepo
- Integration testing infrastructure
- Docker-based test execution

### Docker Configuration
- Multi-stage build process for optimized images
- Alpine-based images for smaller size
- Turborepo pruning for minimal build context
- Dedicated test directory with testing infrastructure
- Docker Compose setup for local development and testing
- GitHub Actions integration for CI/CD
