export interface TestCase {
  args: unknown[];
  expected: unknown;
}

export interface Problem {
  id: string;
  pattern: string;
  title: string;
  /** Paragraphs; `backticks` render as code. */
  prompt: string[];
  fn: string;
  params: string;
  tests: TestCase[];
  /** Ordered from a gentle nudge to nearly the whole idea. */
  hints: string[];
  solution: string;
  complexity: string;
}
