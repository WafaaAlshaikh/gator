import { XMLParser } from "fast-xml-parser";

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  const xml = await response.text();

  const parser = new XMLParser({
    processEntities: false,
  });

  const parsed = parser.parse(xml);

  const channel = parsed.rss?.channel;

  if (!channel) {
    throw new Error("RSS feed has no channel");
  }

  if (
    typeof channel.title !== "string" ||
    typeof channel.link !== "string" ||
    typeof channel.description !== "string"
  ) {
    throw new Error("RSS feed has invalid channel metadata");
  }

  const rawItems = channel.item;
  const items: RSSItem[] = [];

  if (rawItems) {
    const itemArray = Array.isArray(rawItems)
      ? rawItems
      : [rawItems];

    for (const item of itemArray) {
      if (
        typeof item.title !== "string" ||
        typeof item.link !== "string" ||
        typeof item.description !== "string" ||
        typeof item.pubDate !== "string"
      ) {
        continue;
      }

      items.push({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate,
      });
    }
  }

  return {
    channel: {
      title: channel.title,
      link: channel.link,
      description: channel.description,
      item: items,
    },
  };
}