import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));

const candidates = [
  path.resolve(here, "..", ".env"),
  path.resolve(here, "..", "..", ".env"),
  path.resolve(here, "..", "..", "..", ".env"),
  path.resolve(here, "..", "..", "..", "..", ".env"),
];

for (const file of candidates) {
  dotenv.config({ path: file });
}
