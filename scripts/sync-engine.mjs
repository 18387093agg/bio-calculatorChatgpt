import { readFile, writeFile } from "node:fs/promises";

const sourceUrl = new URL("../src/calculation/engine.ts", import.meta.url);
const outputUrl = new URL("../public/calculation-engine.js", import.meta.url);

let source;

try {
  source = await readFile(sourceUrl);
} catch (error) {
  if (error?.code === "ENOENT") {
    throw new Error(
      `Cannot synchronize the calculation engine: source file is missing at ${sourceUrl.pathname}`,
      { cause: error },
    );
  }

  throw error;
}

const firstLineEnd = source.indexOf("\n");
const publishedEngine = firstLineEnd === -1 ? source.subarray(0, 0) : source.subarray(firstLineEnd + 1);

await writeFile(outputUrl, publishedEngine);
