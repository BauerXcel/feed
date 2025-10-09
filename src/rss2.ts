import * as convert from "xml-js";
import { generator } from "./config";
import type { Extension, Feed } from "./feed";
import type {
  Element,
  ElementBranchNode,
  Enclosure,
  SerializableAttributes
} from "./typings";

import { sanitize } from "./utils";

/**
 * Returns a RSS 2.0 feed
 */
export default (ins: Feed) => {
  const { options } = ins;
  let isAtom = false;
  let isContent = false;

  const serializableFeed = {
    declaration: { attributes: { version: "1.0", encoding: "utf-8" } as SerializableAttributes },
    elements: [
      {
        type: "element",
        name: "rss",
        attributes: { version: "2.0" } as SerializableAttributes,
        elements: [
          {
            type: "element",
            name: "channel",
            attributes: {},
            elements: [] as ElementBranchNode[],
          }
        ]
      }
    ],
  }

  const rssAttributes = serializableFeed.elements[0].attributes

  const channelElements = serializableFeed.elements[0].elements[0].elements

  const pushTextElement = (name: string, text: string | number | boolean) =>
    channelElements.push({ type: "element", name, elements: [{ type: "text", text: text }] });

  pushTextElement("title", options.title);
  if (options.link) pushTextElement("link", sanitize(options.link));
  if (options.description) pushTextElement("description", options.description);
  pushTextElement("lastBuildDate", options.updated ? options.updated.toUTCString() : new Date().toUTCString());
  pushTextElement("docs", options.docs ? options.docs : "https://validator.w3.org/feed/docs/rss2.html" );
  pushTextElement("generator", options.generator || generator);


  /**
   * Channel language
   * https://validator.w3.org/feed/docs/rss2.html#ltlanguagegtSubelementOfLtchannelgt
   */
  if (options.language) pushTextElement("language", options.language);

  /**
   * Channel ttl
   * https://validator.w3.org/feed/docs/rss2.html#ltttlgtSubelementOfLtchannelgt
   */
  if (options.ttl) pushTextElement("ttl", options.ttl);

  /**
   * Channel Image
   * https://validator.w3.org/feed/docs/rss2.html#ltimagegtSubelementOfLtchannelgt
   */
  if (options.image) {
    const imageElements: ElementBranchNode[] = []
    imageElements.push(
      {
        type: "element",
        name: "title",
        elements: [{ type: "text", text: options.title }]
      },
      {
        type: "element",
        name: "url",
        elements: [{ type: "text", text: options.image }]
      },
    )
    if (options.link) {
      imageElements.push({
        type: "element",
        name: "link",
        elements: [{ type: "text", text: sanitize(options.link) }]
      })
    }
    channelElements.push({
      type: "element",
      name: "image",
      elements: imageElements
    });
  }

  /**
   * Channel Copyright
   * https://validator.w3.org/feed/docs/rss2.html#optionalChannelElements
   */
  if (options.copyright) pushTextElement("copyright", options.copyright);

  /**
   * Channel Categories
   * https://validator.w3.org/feed/docs/rss2.html#comments
   */
  for (const category of ins.categories) pushTextElement("category", category);

  /**
   * Hub for PubSubHubbub
   * https://code.google.com/p/pubsubhubbub/
   */
  if (options.hub) {
    isAtom = true;
    channelElements.push({
      type: "element",
      name: "atom:link",
      attributes: {
        href: sanitize(options.hub),
        rel: "hub",
      },
    })
  } else {
    /**
     * Feed URL
     * http://validator.w3.org/feed/docs/warning/MissingAtomSelfLink.html
     */
    const atomLink = options.feed || (options.feedLinks && options.feedLinks.rss);
    if (atomLink) {
      isAtom = true;
      channelElements.push({
        type: "element",
        name: "atom:link",
        attributes: {
          href: sanitize(atomLink),
          rel: "self",
          type: "application/rss+xml",
        }
      })
    }
  }

  /**
   * Channel Categories
   * https://validator.w3.org/feed/docs/rss2.html#hrelementsOfLtitemgt
   */
  for (const item of ins.items) {
    const itemNode = {
      type: "element" as const,
      name: "item",
      elements: [] as ElementBranchNode[]
    }

    if (item.title) {
      itemNode.elements.push({ name: "title", type: "element", elements: [{ cdata: item.title, type: "cdata"}] });
    }

    if (item.link) {
      itemNode.elements.push({ name: "link", type: "element", elements: [{ text: sanitize(item.link), type: "text"}] });
    }

    if (item.guid) {
      itemNode.elements.push({ name: "guid", type: "element", attributes: { isPermaLink: "false" }, elements: [{ text: item.guid, type: "text"}] });
    } else if (item.id) {
      itemNode.elements.push({ name: "guid", type: "element", attributes: { isPermaLink: "false" }, elements: [{ text: item.id, type: "text"}] });
    } else if (item.link) {
      itemNode.elements.push({ name: "guid", type: "element", attributes: { isPermaLink: "true" }, elements: [{ text: sanitize(item.link), type: "text"}] });
    }

    if (item.published) {
      itemNode.elements.push({ name: "pubDate",type: "element", elements: [{ text: item.published.toUTCString(), type: "text"}] });
    } else if (item.date) {
      itemNode.elements.push({ name: "pubDate", type: "element", elements: [{ text: item.date.toUTCString(), type: "text" }] });
    }

    if (item.description) {
      itemNode.elements.push({ name: "description", type: "element", elements: [{ cdata: item.description, type: "cdata" }] });
    }

    if (item.content) {
      isContent = true;
      itemNode.elements.push({ name: "content:encoded", type: "element", elements: [{ cdata: item.content, type: "cdata" }] });
    }

    /**
     * Item Author
     * https://validator.w3.org/feed/docs/rss2.html#ltauthorgtSubelementOfLtitemgt
     */
    for (const author of item.author ?? []) {
      if (author?.email && author.name){
        itemNode.elements.push({
          type: "element",
          name: "author",
          elements: [{
            type: "text",
            text: `${author.email} (${author.name})`
          }]
        });
      }
    }

    /**
     * Item Category
     * https://validator.w3.org/feed/docs/rss2.html#ltcategorygtSubelementOfLtitemgt
     */
    for (const category of item.category ?? []) {
      if (category.name) {
        itemNode.elements.push({
          type: "element",
          name: "category",
          attributes: {
            domain: category.domain
          },
          elements: [{
            type: "text",
            text: category.name
          }]
        });
      }
    }

    /**
     * Item Enclosure
     * https://validator.w3.org/feed/docs/rss2.html#ltenclosuregtSubelementOfLtitemgt
     */
    if (item.video) {
      itemNode.elements.push(formatEnclosure(item.video, "video") as any);
    }else if (item.audio) {
      let duration = undefined;
      if (options.podcast && typeof item.audio !== "string" && item.audio.duration) {
        duration = item.audio.duration;
        item.audio.duration = undefined;
      }
      itemNode.elements.push(formatEnclosure(item.audio, "audio") as any)

      if (duration) {
        itemNode.elements.push({
          name:"itunes:duration",
          type: "element",
          elements: [{ text: formatDuration(duration), type: "text" }]
        })
      }
    } else if (item.image) {
      if (item.image) {
        itemNode.elements.push(formatEnclosure(item.image, "image") as any);
      }
    } else if (item.enclosure) {
      itemNode.elements.push(formatEnclosure(item.enclosure) as any)
    }

    itemNode.elements.push(...(item.extensions ?? []).map(e => serializeExtension(e)))

    channelElements.push(itemNode)
  }

  if (isContent) {
    rssAttributes["xmlns:dc"] = "http://purl.org/dc/elements/1.1/";
    rssAttributes["xmlns:content"] = "http://purl.org/rss/1.0/modules/content/";
  }

  // rss2() support `extensions`

  channelElements.push(...(ins.extensions ?? []).map(e => serializeExtension(e)))

  if (isAtom) {
    rssAttributes["xmlns:atom"] = "http://www.w3.org/2005/Atom";
  }

  /**
   * Podcast extensions
   * https://support.google.com/podcast-publishers/answer/9889544?hl=en
   */
  if (options.podcast) {
    rssAttributes["xmlns:googleplay"] = "http://www.google.com/schemas/play-podcasts/1.0";
    rssAttributes["xmlns:itunes"] = "http://www.itunes.com/dtds/podcast-1.0.dtd";
    if (options.category) {
      pushTextElement("googleplay:category", options.category)
      pushTextElement("itunes:category", options.category)
    }
    if (options.author?.email) {
      pushTextElement("googleplay:owner", options.author.email)
      channelElements.push({
        type: "element",
        name: "itunes:owner",
        elements: [{
          type: "element",
          name: "itunes:email",
          elements: [{ type: "text", text: options.author.email }]
        }]
      })
    }
    if (options.author?.name) {
      pushTextElement("googleplay:author", options.author.name)
      pushTextElement("itunes:author", options.author.name)
    }
    if (options.image) {
      channelElements.push({
        type: "element",
        name: "googleplay:image",
        attributes: { href: sanitize(options.image) }
      })
    }
  }

  return convert.js2xml(serializableFeed, { compact: false, ignoreComment: true, spaces: 4 });
};

/**
 * Returns a formated enclosure
 * @param enclosure
 * @param mimeCategory
 */
const formatEnclosure = (enclosure: string | Enclosure, mimeCategory = "image"): Element => {
  if (typeof enclosure === "string") {
    const type = new URL(sanitize(enclosure)).pathname.split(".").slice(-1)[0];
    return { type: "element", name: "enclosure", attributes: { url: enclosure, length: 0, type: `${mimeCategory}/${type}` } };
  }

  const type = new URL(sanitize(enclosure.url)).pathname.split(".").slice(-1)[0];
  return { type: "element", name: "enclosure", attributes: { length: 0, type: `${mimeCategory}/${type}`, ...enclosure } };
};

/**
 * Returns a formated duration from seconds
 * @param duration
 */
const formatDuration = (duration: number) => {
  const seconds = duration % 60;
  const totalMinutes = Math.floor(duration / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const notHours = ("0" + minutes).substr(-2) + ":" + ("0" + seconds).substr(-2);
  return hours > 0 ? hours + ":" + notHours : notHours;
};

const serializeExtension = (extension: Extension): ElementBranchNode => {
  let elements: Element[] | undefined
  let attributes: Record<string, string | number | undefined> | undefined

  switch (extension.type) {
    case "element":
      elements = extension.elements?.map(e => serializeExtension(e))
      attributes = extension.attributes
      break
    case "text":
      elements = [{ type: "text", text: extension.text }]
      break
    case "cdata":
      elements = [{ type: "cdata", cdata: extension.cdata }]
      break
  }

  return {
    type: "element",
    name: extension.name,
    elements: elements,
    attributes: attributes
  } as ElementBranchNode
}
