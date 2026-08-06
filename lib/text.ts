// Trims and collapses internal whitespace runs to a single space, so
// e.g. "B.Sc.  Computer   Science" and "B.Sc. Computer Science" are
// treated as the same value everywhere it's saved or matched against
// (profile institution/faculty/degree, group target_degree, course
// name/search). Plain .trim() alone only handles leading/trailing
// whitespace.
export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
