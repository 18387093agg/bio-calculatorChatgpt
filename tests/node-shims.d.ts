declare module 'node:test' { const test: (name: string, fn: () => void) => void; export default test; }
declare module 'node:assert/strict' { const assert: { ok(value: unknown): asserts value; equal(actual: unknown, expected: unknown): void; deepEqual(actual: unknown, expected: unknown): void }; export default assert; }
