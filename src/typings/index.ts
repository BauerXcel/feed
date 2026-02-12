import type { AtLeastOneOf } from "../utils";

export interface Item {
  title: string;
  id?: string;
  link: string;
  date: Date;

  description?: string;
  content?: string;
  category?: Category[];

  guid?: string;

  image?: string | Enclosure;
  audio?: string | Enclosure;
  video?: string | Enclosure;
  enclosure?: Enclosure;

  author?: Author[];
  contributor?: Author[];

  published?: Date;
  copyright?: string;

  extensions?: Extension[];
}

export interface Enclosure {
  url: string;
  type?: string;
  length?: number;
  title?: string;
  duration?: number;
}

export interface Author {
  name?: string;
  email?: string;
  link?: string;
  avatar?: string;
}

export interface Category {
  name?: string;
  domain?: string;
  scheme?: string;
  term?: string;
}

export interface FeedOptions {
  id: string;
  title: string;
  updated?: Date;
  generator?: string;
  language?: string;
  ttl?: number;

  feed?: string;
  feedLinks?: any;
  hub?: string;
  docs?: string;

  podcast?: boolean;
  category?: string;

  author?: Author;
  link?: string;
  description?: string;
  image?: string;
  favicon?: string;
  copyright: string;
}


type Name = {
  name: string
}

export type SerializableAttributes = Record<string, string | number | undefined>

export type ElementLeafNodeText = {
  type: "text"
  text: string | number | boolean,
  attributes?: SerializableAttributes
}

export type ExtensionLeafNodeText = ElementLeafNodeText & Name

export type ElementLeafNodeCData = {
  type: "cdata"
  cdata: string
  attributes?: SerializableAttributes
}

export type ExtensionLeafNodeCData = ElementLeafNodeCData & Name

type ElementsBase = {
  type: "element"
  name: string
}

export type ElementBranchNode = ElementsBase & AtLeastOneOf<{ elements: Element[] } | { attributes: SerializableAttributes }>
export type Element = ElementLeafNodeText | ElementLeafNodeCData | ElementBranchNode

export type ExtensionBranchNode = ElementsBase & AtLeastOneOf<{ elements: Extension[] } | { attributes: SerializableAttributes }>
export type Extension = ExtensionLeafNodeText | ExtensionLeafNodeCData | ExtensionBranchNode

