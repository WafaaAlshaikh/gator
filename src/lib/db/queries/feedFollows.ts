import { eq } from "drizzle-orm";
import { db } from "..";
import {
  feedFollows,
  feeds,
  users,
} from "../schema";

export async function createFeedFollow(
  userId: string,
  feedId: string,
) {
  const [newFeedFollow] = await db
    .insert(feedFollows)
    .values({
      userId,
      feedId,
    })
    .returning();

  const [result] = await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(
      feeds,
      eq(feedFollows.feedId, feeds.id),
    )
    .innerJoin(
      users,
      eq(feedFollows.userId, users.id),
    )
    .where(
      eq(feedFollows.id, newFeedFollow.id),
    );

  return result;
}

export async function getFeedFollowsForUser(
  userId: string,
) {
  return await db
    .select({
      feedName: feeds.name,
      userName: users.name,
    })
    .from(feedFollows)
    .innerJoin(
      feeds,
      eq(feedFollows.feedId, feeds.id),
    )
    .innerJoin(
      users,
      eq(feedFollows.userId, users.id),
    )
    .where(
      eq(feedFollows.userId, userId),
    );
}

export async function deleteFeedFollow(
  userId: string,
  feedId: string,
) {
  await db
    .delete(feedFollows)
    .where(
      eq(feedFollows.userId, userId),
    )
    .where(
      eq(feedFollows.feedId, feedId),
    );
}