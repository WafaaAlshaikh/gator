import { db } from "..";
import { desc, eq } from "drizzle-orm";
import {
  posts,
  feedFollows,
} from "../schema";

export async function createPost(
  title: string,
  url: string,
  description: string | null,
  publishedAt: Date | null,
  feedId: string,
) {
  const [post] = await db
    .insert(posts)
    .values({
      title,
      url,
      description,
      publishedAt,
      feedId,
    })
    .onConflictDoNothing()
    .returning();

  return post;
}

export async function getPostsForUser(
  userId: string,
  limit: number,
) {
  return await db
    .select({
      id: posts.id,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedId: posts.feedId,
    })
    .from(posts)
    .innerJoin(
      feedFollows,
      eq(posts.feedId, feedFollows.feedId),
    )
    .where(
      eq(feedFollows.userId, userId),
    )
    .orderBy(
      desc(posts.publishedAt),
    )
    .limit(limit);
}