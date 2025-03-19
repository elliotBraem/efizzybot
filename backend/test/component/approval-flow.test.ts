import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import nock from "nock";
import {
  createMockCuratorTweet,
  createMockModeratorTweet,
  createMockTweet,
} from "../utils/test-data";
import {
  cleanupTestServer,
  setupDefaultTwitterMocks,
  setupTestServer,
} from "../utils/test-helpers";

describe("Approval Flow", () => {
  let apiClient;
  let server;

  beforeAll(async () => {
    // Initialize the server with a random port for testing
    const testSetup = await setupTestServer();
    server = testSetup.server;
    apiClient = testSetup.apiClient;

    // Disable external network requests
    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");
  });

  afterAll(async () => {
    await cleanupTestServer(server);
    nock.enableNetConnect();
  });

  beforeEach(() => {
    nock.cleanAll();
    setupDefaultTwitterMocks();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("When a moderator approves a submission, it should be processed and distributed", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    // Mock Twitter API for the original tweet
    nock("https://api.twitter.com")
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);

    // Mock the fetchSearchTweets response for the submission tweet
    nock("https://api.twitter.com")
      .get(/\/graphql\/.*\/SearchTimeline\?.*/)
      .reply(200, {
        data: {
          search_by_raw_query: {
            search_timeline: {
              timeline: {
                instructions: [
                  {
                    type: "TimelineAddEntries",
                    entries: [
                      {
                        entryId: "tweet-1",
                        content: {
                          entryType: "TimelineTimelineItem",
                          itemContent: {
                            itemType: "TimelineTweet",
                            tweet_results: {
                              result: {
                                rest_id: curatorTweet.id,
                                legacy: {
                                  created_at: new Date().toISOString(),
                                  full_text: curatorTweet.text,
                                  in_reply_to_status_id_str: tweet.id,
                                  entities: {
                                    hashtags: curatorTweet.hashtags.map(tag => ({ text: tag })),
                                    user_mentions: curatorTweet.mentions.map(mention => ({ screen_name: mention.username }))
                                  }
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: curatorTweet.username,
                                      },
                                      rest_id: curatorTweet.userId
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                ]
              }
            }
          }
        }
      });

    // Trigger the checkMentions method to process the submission
    await server.context.submissionService["checkMentions"]();

    // Mock the moderator list
    nock("http://localhost")
      .get(/\/api\/feed\/.*\/moderators/)
      .reply(200, {
        moderators: [
          {
            userId: "moderator_id",
            username: "moderator",
          },
        ],
      });

    // Mock distribution service
    nock("http://localhost")
      .post("/api/distribution")
      .reply(200, { success: true });

    // Create a moderator tweet for approval
    const moderatorTweet = createMockModeratorTweet(curatorTweet.id, "approve");

    // Mock the fetchSearchTweets response for the moderation tweet
    // This time we need to return both tweets in chronological order
    nock("https://api.twitter.com")
      .get(/\/graphql\/.*\/SearchTimeline\?.*/)
      .reply(200, {
        data: {
          search_by_raw_query: {
            search_timeline: {
              timeline: {
                instructions: [
                  {
                    type: "TimelineAddEntries",
                    entries: [
                      {
                        entryId: "tweet-1",
                        content: {
                          entryType: "TimelineTimelineItem",
                          itemContent: {
                            itemType: "TimelineTweet",
                            tweet_results: {
                              result: {
                                rest_id: curatorTweet.id,
                                legacy: {
                                  created_at: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
                                  full_text: curatorTweet.text,
                                  in_reply_to_status_id_str: tweet.id,
                                  entities: {
                                    hashtags: curatorTweet.hashtags.map(tag => ({ text: tag })),
                                    user_mentions: curatorTweet.mentions.map(mention => ({ screen_name: mention.username }))
                                  }
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: curatorTweet.username,
                                      },
                                      rest_id: curatorTweet.userId
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      {
                        entryId: "tweet-2",
                        content: {
                          entryType: "TimelineTimelineItem",
                          itemContent: {
                            itemType: "TimelineTweet",
                            tweet_results: {
                              result: {
                                rest_id: moderatorTweet.id,
                                legacy: {
                                  created_at: new Date().toISOString(), // now
                                  full_text: moderatorTweet.text,
                                  in_reply_to_status_id_str: curatorTweet.id,
                                  entities: {
                                    hashtags: moderatorTweet.hashtags.map(tag => ({ text: tag })),
                                    user_mentions: moderatorTweet.mentions.map(mention => ({ screen_name: mention.username }))
                                  }
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: moderatorTweet.username,
                                      },
                                      rest_id: moderatorTweet.userId
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                ]
              }
            }
          }
        }
      });

    // Trigger the checkMentions method again to process the moderation
    await server.context.submissionService["checkMentions"]();

    // Verify the submission was approved
    const submissionResponse = await apiClient.get(
      `/api/submission/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "approved",
    });
  });

  test("When a moderator rejects a submission, it should be marked as rejected", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    // Mock Twitter API for the original tweet
    nock("https://api.twitter.com")
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);

    // Mock the fetchSearchTweets response for the submission tweet
    nock("https://api.twitter.com")
      .get(/\/graphql\/.*\/SearchTimeline\?.*/)
      .reply(200, {
        data: {
          search_by_raw_query: {
            search_timeline: {
              timeline: {
                instructions: [
                  {
                    type: "TimelineAddEntries",
                    entries: [
                      {
                        entryId: "tweet-1",
                        content: {
                          entryType: "TimelineTimelineItem",
                          itemContent: {
                            itemType: "TimelineTweet",
                            tweet_results: {
                              result: {
                                rest_id: curatorTweet.id,
                                legacy: {
                                  created_at: new Date().toISOString(),
                                  full_text: curatorTweet.text,
                                  in_reply_to_status_id_str: tweet.id,
                                  entities: {
                                    hashtags: curatorTweet.hashtags.map(tag => ({ text: tag })),
                                    user_mentions: curatorTweet.mentions.map(mention => ({ screen_name: mention.username }))
                                  }
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: curatorTweet.username,
                                      },
                                      rest_id: curatorTweet.userId
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                ]
              }
            }
          }
        }
      });

    // Trigger the checkMentions method to process the submission
    await server.context.submissionService["checkMentions"]();

    // Mock the moderator list
    nock("http://localhost")
      .get(/\/api\/feed\/.*\/moderators/)
      .reply(200, {
        moderators: [
          {
            userId: "moderator_id",
            username: "moderator",
          },
        ],
      });

    // Create a moderator tweet for rejection
    const moderatorTweet = createMockModeratorTweet(curatorTweet.id, "reject");

    // Mock the fetchSearchTweets response for the moderation tweet
    nock("https://api.twitter.com")
      .get(/\/graphql\/.*\/SearchTimeline\?.*/)
      .reply(200, {
        data: {
          search_by_raw_query: {
            search_timeline: {
              timeline: {
                instructions: [
                  {
                    type: "TimelineAddEntries",
                    entries: [
                      {
                        entryId: "tweet-1",
                        content: {
                          entryType: "TimelineTimelineItem",
                          itemContent: {
                            itemType: "TimelineTweet",
                            tweet_results: {
                              result: {
                                rest_id: curatorTweet.id,
                                legacy: {
                                  created_at: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
                                  full_text: curatorTweet.text,
                                  in_reply_to_status_id_str: tweet.id,
                                  entities: {
                                    hashtags: curatorTweet.hashtags.map(tag => ({ text: tag })),
                                    user_mentions: curatorTweet.mentions.map(mention => ({ screen_name: mention.username }))
                                  }
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: curatorTweet.username,
                                      },
                                      rest_id: curatorTweet.userId
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      {
                        entryId: "tweet-2",
                        content: {
                          entryType: "TimelineTimelineItem",
                          itemContent: {
                            itemType: "TimelineTweet",
                            tweet_results: {
                              result: {
                                rest_id: moderatorTweet.id,
                                legacy: {
                                  created_at: new Date().toISOString(), // now
                                  full_text: moderatorTweet.text,
                                  in_reply_to_status_id_str: curatorTweet.id,
                                  entities: {
                                    hashtags: moderatorTweet.hashtags.map(tag => ({ text: tag })),
                                    user_mentions: moderatorTweet.mentions.map(mention => ({ screen_name: mention.username }))
                                  }
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: moderatorTweet.username,
                                      },
                                      rest_id: moderatorTweet.userId
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                ]
              }
            }
          }
        }
      });

    // Trigger the checkMentions method again to process the moderation
    await server.context.submissionService["checkMentions"]();

    // Verify the submission was rejected
    const submissionResponse = await apiClient.get(
      `/api/submission/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "rejected",
    });
  });

  test("When a non-moderator tries to approve a submission, it should be ignored", async () => {
    // Arrange
    const tweet = createMockTweet();
    const curatorTweet = createMockCuratorTweet(tweet.id);

    // Mock Twitter API for the original tweet
    nock("https://api.twitter.com")
      .get(`/tweets/${tweet.id}`)
      .reply(200, tweet);

    // Mock the fetchSearchTweets response for the submission tweet
    nock("https://api.twitter.com")
      .get(/\/graphql\/.*\/SearchTimeline\?.*/)
      .reply(200, {
        data: {
          search_by_raw_query: {
            search_timeline: {
              timeline: {
                instructions: [
                  {
                    type: "TimelineAddEntries",
                    entries: [
                      {
                        entryId: "tweet-1",
                        content: {
                          entryType: "TimelineTimelineItem",
                          itemContent: {
                            itemType: "TimelineTweet",
                            tweet_results: {
                              result: {
                                rest_id: curatorTweet.id,
                                legacy: {
                                  created_at: new Date().toISOString(),
                                  full_text: curatorTweet.text,
                                  in_reply_to_status_id_str: tweet.id,
                                  entities: {
                                    hashtags: curatorTweet.hashtags.map(tag => ({ text: tag })),
                                    user_mentions: curatorTweet.mentions.map(mention => ({ screen_name: mention.username }))
                                  }
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: curatorTweet.username,
                                      },
                                      rest_id: curatorTweet.userId
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                ]
              }
            }
          }
        }
      });

    // Trigger the checkMentions method to process the submission
    await server.context.submissionService["checkMentions"]();

    // Mock the moderator list to return empty (non-moderator)
    nock("http://localhost")
      .get(/\/api\/feed\/.*\/moderators/)
      .reply(200, {
        moderators: [],
      });

    // Create a non-moderator tweet for approval
    const nonModeratorTweet = {
      ...createMockModeratorTweet(curatorTweet.id, "approve"),
      username: "non_moderator",
      userId: "non_moderator_id",
    };

    // Mock the fetchSearchTweets response for the non-moderator tweet
    nock("https://api.twitter.com")
      .get(/\/graphql\/.*\/SearchTimeline\?.*/)
      .reply(200, {
        data: {
          search_by_raw_query: {
            search_timeline: {
              timeline: {
                instructions: [
                  {
                    type: "TimelineAddEntries",
                    entries: [
                      {
                        entryId: "tweet-1",
                        content: {
                          entryType: "TimelineTimelineItem",
                          itemContent: {
                            itemType: "TimelineTweet",
                            tweet_results: {
                              result: {
                                rest_id: curatorTweet.id,
                                legacy: {
                                  created_at: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
                                  full_text: curatorTweet.text,
                                  in_reply_to_status_id_str: tweet.id,
                                  entities: {
                                    hashtags: curatorTweet.hashtags.map(tag => ({ text: tag })),
                                    user_mentions: curatorTweet.mentions.map(mention => ({ screen_name: mention.username }))
                                  }
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: curatorTweet.username,
                                      },
                                      rest_id: curatorTweet.userId
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      {
                        entryId: "tweet-2",
                        content: {
                          entryType: "TimelineTimelineItem",
                          itemContent: {
                            itemType: "TimelineTweet",
                            tweet_results: {
                              result: {
                                rest_id: nonModeratorTweet.id,
                                legacy: {
                                  created_at: new Date().toISOString(), // now
                                  full_text: nonModeratorTweet.text,
                                  in_reply_to_status_id_str: curatorTweet.id,
                                  entities: {
                                    hashtags: nonModeratorTweet.hashtags.map(tag => ({ text: tag })),
                                    user_mentions: nonModeratorTweet.mentions.map(mention => ({ screen_name: mention.username }))
                                  }
                                },
                                core: {
                                  user_results: {
                                    result: {
                                      legacy: {
                                        screen_name: nonModeratorTweet.username,
                                      },
                                      rest_id: nonModeratorTweet.userId
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                ]
              }
            }
          }
        }
      });

    // Trigger the checkMentions method again to process the non-moderator tweet
    await server.context.submissionService["checkMentions"]();

    // Verify the submission was not approved (still pending)
    const submissionResponse = await apiClient.get(
      `/api/submission/${tweet.id}`,
    );
    expect(submissionResponse.status).toBe(200);
    expect(submissionResponse.data).toMatchObject({
      tweetId: tweet.id,
      status: "pending", // Still pending, not approved
    });
  });
});
