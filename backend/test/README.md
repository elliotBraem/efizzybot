# Testing Infrastructure

This directory contains the testing infrastructure for the curate.fun backend. The tests are organized according to Node.js testing best practices, focusing on component tests as the primary testing strategy.

## Directory Structure

```
backend/test/
├── setup/                      # Test setup files
│   ├── global-setup.ts         # Global setup for all tests
│   ├── global-teardown.ts      # Global teardown for all tests
│   └── docker-compose.yml      # Docker compose for test infrastructure
├── utils/                      # Test utilities
│   ├── test-client.ts          # HTTP client for API testing
│   ├── test-data.ts            # Test data factories
│   └── test-helpers.ts         # Helper functions for tests
├── component/                  # Component tests (primary focus)
│   ├── submission-flow.test.ts # Tests for submission flow
│   └── approval-flow.test.ts   # Tests for approval flow
├── unit/                       # Unit tests (secondary focus)
│   └── sanitize.test.ts        # Tests for sanitization utilities
├── integration/                # Integration tests
│   └── database.test.ts        # Database integration tests
└── e2e/                        # End-to-end tests
    └── full-flow.test.ts       # Full flow from submission to distribution
```

## Testing Approach

Our testing strategy follows these principles:

1. **Component Testing Strategy**:
   - Focus on component tests as the primary testing strategy
   - Run a very few E2E tests
   - Cover features, not functions
   - Write tests during coding, never after
   - Test the five known backend exit doors (outcomes)

2. **Infrastructure and Database Setup**:
   - Use Docker-Compose to host the database and other infrastructure
   - Start docker-compose using code in the global setup process
   - Shutoff the infrastructure only in the CI environment
   - Optimize your real DB for testing, don't fake it
   - Store test data in RAM folder
   - Build the DB schema using migrations

3. **Web Server Setup**:
   - The test and the backend should live within the same process
   - Let the tests control when the server should start and shutoff
   - Specify a port in production, randomize in testing

4. **Test Anatomy**:
   - Stick to unit testing best practices, aim for great developer-experience
   - Approach the API using a library that is a pure HTTP client
   - Provide real credentials or token
   - Assert on the entire HTTP response object, not on every field
   - Structure tests by routes and stories
   - Test the five potential outcomes

5. **Integration Testing**:
   - Isolate the component from the world using HTTP interceptor
   - Define default responses before every test to ensure a clean slate
   - Override the happy defaults with corner cases using unique paths
   - Deny all outgoing requests by default
   - Simulate network chaos
   - Catch invalid outgoing requests by specifying the request schema
   - Record real outgoing requests for awareness
   - Code against a strict API provider contract
   - Fake the time to minimize network call duration

6. **Data Management**:
   - Each test should act on its own records only
   - Only metadata and context data should get pre-seeded to the database
   - Assert the new data state using the public API
   - Choose a clear data clean-up strategy: After-all (recommended) or after-each
   - Add some randomness to unique fields
   - Test also the response schema
   - Install the DB schema using the same technique like production
   - Test for undesired side effects

## Running Tests

### Prerequisites

- Docker and Docker Compose installed
- Bun installed
- PostgreSQL client installed (optional, for debugging)

### Setup

1. Install dependencies:
   ```
   bun install
   ```

2. Start the test infrastructure:
   ```
   bun test:setup
   ```

### Running Tests

- Run all tests:
  ```
  bun test
  ```

- Run specific test types:
  ```
  bun test:unit        # Run unit tests
  bun test:component   # Run component tests
  bun test:integration # Run integration tests
  bun test:e2e         # Run end-to-end tests
  ```

- Run tests in watch mode:
  ```
  bun test:watch
  ```

### Teardown

- Tear down the test infrastructure (only needed in CI, as local development keeps it running):
  ```
  bun test:teardown
  ```

## Writing Tests

### Component Tests

Component tests should focus on testing the system as a whole, with real infrastructure but mocked external services. They should test the main flows of the application, such as submission, approval, and distribution.

Example:
```typescript
test('When a tweet is submitted to a feed, it should be saved and pending approval', async () => {
  // Arrange
  const tweet = createMockTweet();
  const curatorTweet = createMockCuratorTweet(tweet.id);
  
  // Mock Twitter API
  nock('https://api.twitter.com')
    .get(`/tweets/${tweet.id}`)
    .reply(200, tweet);
  
  // Act
  const response = await apiClient.post('/api/twitter/mention', {
    tweet: curatorTweet,
  });
  
  // Assert
  expect(response.status).toBe(200);
  
  // Verify the submission was saved
  const submissionResponse = await apiClient.get(`/api/submission/${tweet.id}`);
  expect(submissionResponse.status).toBe(200);
  expect(submissionResponse.data).toMatchObject({
    tweetId: tweet.id,
    status: 'pending',
  });
});
```

### Unit Tests

Unit tests should focus on testing individual functions and utilities in isolation. They should be fast and not require any external services.

### Integration Tests

Integration tests should focus on testing the integration with external services, such as the database or Twitter API. They should use real infrastructure but may mock some external services.

### E2E Tests

E2E tests should focus on testing the full flow of the application, from submission to distribution. They should use real infrastructure and minimal mocking.
