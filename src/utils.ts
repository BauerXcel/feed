export function sanitize(url: string): string
export function sanitize(url: undefined): undefined
export function sanitize(url: string | undefined): string | undefined
export function sanitize(url: string | undefined): string | undefined {
  return url?.replace(/&/g, "&amp;");
}

// U is distributed (into a union of functions) in the first statement and in the second statement the parameter for
// this union of functions is contravariantly inferred
export type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

export type AtLeastOneOf<T> = UnionToIntersection<T> extends infer O
  ? { [K in keyof O]: Pick<O, K> & Partial<Omit<O, K>> }[keyof O]
  : never;

