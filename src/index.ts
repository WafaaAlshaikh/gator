import { readConfig, setUser } from "./config.js";
import {
  createUser,
  getUserByName,
  deleteAllUsers,
  getUsers,
} from "./lib/db/queries/users.js";
import { fetchFeed } from "./lib/rss.js";
import {
  createFeed,
  getFeeds,
  getFeedByUrl,
  getNextFeedToFetch,
  markFeedFetched,
} from "./lib/db/queries/feeds.js";
import {
  Feed,
  User,
} from "./lib/db/schema.js";
import {
  createFeedFollow,
  getFeedFollowsForUser,
  deleteFeedFollow,
} from "./lib/db/queries/feedFollows.js";
import {
  createPost,
  getPostsForUser,
} from "./lib/db/queries/posts.js";

function printFeed(feed: Feed, user: User) {
  console.log("Feed:");
  console.log(`  ID: ${feed.id}`);
  console.log(`  Name: ${feed.name}`);
  console.log(`  URL: ${feed.url}`);
  console.log(`  User: ${user.name}`);
  console.log(`  User ID: ${user.id}`);
}

function parsePublishedAt(
  pubDate: string,
): Date | null {
  const date = new Date(pubDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

type CommandsRegistry = Record<string, CommandHandler>;

async function handlerLogin(
  cmdName: string,
  ...args: string[]
) {
  if (args.length === 0) {
    throw new Error("username is required");
  }

  const username = args[0];

  const user = await getUserByName(username);

  if (!user) {
    throw new Error("user does not exist");
  }

  setUser(username);

  console.log(`user has been set to ${username}`);
}

async function handlerRegister(
  cmdName: string,
  ...args: string[]
) {
  if (args.length === 0) {
    throw new Error("username is required");
  }

  const username = args[0];

  const existingUser = await getUserByName(username);

  if (existingUser) {
    throw new Error("user already exists");
  }

  const user = await createUser(username);

  setUser(username);

  console.log(`user ${username} was created`);
  console.log(user);
}

async function handlerReset(
  cmdName: string,
  ...args: string[]
) {
  await deleteAllUsers();

  console.log("database reset successfully");
}

async function handlerUsers(
  cmdName: string,
  ...args: string[]
) {
  const users = await getUsers();
  const config = readConfig();

  for (const user of users) {
    if (user.name === config.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

async function handlerAgg(
  cmdName: string,
  ...args: string[]
) {
  if (args.length === 0) {
    throw new Error("time_between_reqs is required");
  }

  const timeBetweenRequests = parseDuration(args[0]);

  console.log(
    `Collecting feeds every ${args[0]}`,
  );

  await scrapeFeeds();

  const interval = setInterval(() => {
    scrapeFeeds().catch((err) => {
      console.error(err);
    });
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log(
        "Shutting down feed aggregator...",
      );

      clearInterval(interval);
      resolve();
    });
  });
}

async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length < 2) {
    throw new Error("name and url are required");
  }

  const name = args[0];
  const url = args[1];

  const feed = await createFeed(
    name,
    url,
    user.id,
  );

  const feedFollow = await createFeedFollow(
    user.id,
    feed.id,
  );

  console.log(
    `${feedFollow.userName} is now following ${feedFollow.feedName}`,
  );

  printFeed(feed, user);
}

async function handlerFeeds(
  cmdName: string,
  ...args: string[]
) {
  const feeds = await getFeeds();

  for (const feed of feeds) {
    console.log(`* ${feed.feedName}`);
    console.log(`  URL: ${feed.feedUrl}`);
    console.log(`  User: ${feed.userName}`);
  }
}

async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length === 0) {
    throw new Error("url is required");
  }

  const url = args[0];

  const feed = await getFeedByUrl(url);

  if (!feed) {
    throw new Error("feed does not exist");
  }

  const feedFollow = await createFeedFollow(
    user.id,
    feed.id,
  );

  console.log(
    `${feedFollow.userName} is now following ${feedFollow.feedName}`,
  );
}

async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length === 0) {
    throw new Error("url is required");
  }

  const url = args[0];

  const feed = await getFeedByUrl(url);

  if (!feed) {
    throw new Error("feed does not exist");
  }

  await deleteFeedFollow(
    user.id,
    feed.id,
  );
}

async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  const feedFollows =
    await getFeedFollowsForUser(user.id);

  for (const feedFollow of feedFollows) {
    console.log(feedFollow.feedName);
  }
}

async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  let limit = 2;

  if (args.length > 0) {
    limit = parseInt(args[0], 10);

    if (Number.isNaN(limit) || limit <= 0) {
      throw new Error(
        "limit must be a positive number",
      );
    }
  }

  const posts = await getPostsForUser(
    user.id,
    limit,
  );

  for (const post of posts) {
    console.log(`* ${post.title}`);
    console.log(`  URL: ${post.url}`);

    if (post.description) {
      console.log(
        `  Description: ${post.description}`,
      );
    }

    if (post.publishedAt) {
      console.log(
        `  Published: ${post.publishedAt.toISOString()}`,
      );
    }

    console.log();
  }
} 

function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (cmdName, ...args) => {
    const config = readConfig();

    if (!config.currentUserName) {
      throw new Error("no user is currently logged in");
    }

    const user = await getUserByName(
      config.currentUserName,
    );

    if (!user) {
      throw new Error(
        `User ${config.currentUserName} not found`,
      );
    }

    await handler(cmdName, user, ...args);
  };
}

function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
) {
  registry[cmdName] = handler;
}

async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
) {
  const handler = registry[cmdName];

  if (handler === undefined) {
    throw new Error(`unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}

async function scrapeFeeds() {
  const feed = await getNextFeedToFetch();

  if (!feed) {
    throw new Error("no feeds found");
  }

  console.log(`Fetching feed: ${feed.name}`);

  const rssFeed = await fetchFeed(feed.url);

  await markFeedFetched(feed.id);

  for (const item of rssFeed.channel.item) {
    const publishedAt = parsePublishedAt(
      item.pubDate,
    );

    await createPost(
      item.title,
      item.link,
      item.description,
      publishedAt,
      feed.id,
    );
  }
}


function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error(
      "invalid duration, use a number followed by ms, s, m, or h",
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error("invalid duration");
  }
}

async function main() {
  const registry: CommandsRegistry = {};

  registerCommand(
    registry,
    "login",
    handlerLogin,
  );

  registerCommand(
    registry,
    "register",
    handlerRegister,
  );

  registerCommand(
    registry,
    "reset",
    handlerReset,
  );

  registerCommand(
    registry,
    "users",
    handlerUsers,
  );

  registerCommand(
    registry,
    "agg",
    handlerAgg,
  );

  registerCommand(
    registry,
    "addfeed",
    middlewareLoggedIn(handlerAddFeed),
  );

  registerCommand(
    registry,
    "feeds",
    handlerFeeds,
  );

  registerCommand(
    registry,
    "follow",
    middlewareLoggedIn(handlerFollow),
  );

  registerCommand(
    registry,
    "unfollow",
    middlewareLoggedIn(handlerUnfollow),
  );

  registerCommand(
    registry,
    "following",
    middlewareLoggedIn(handlerFollowing),
  );

  registerCommand(
    registry,
    "browse",
    middlewareLoggedIn(handlerBrowse),
  );

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(
      "Usage: npm run start <command> [args...]",
    );
    process.exit(1);
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);

  try {
    await runCommand(
      registry,
      cmdName,
      ...cmdArgs,
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  process.exit(0);
}

main();
