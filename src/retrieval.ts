import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIR = join(__dirname, "knowledge-base");

export interface Chunk {
  id: string;
  source: string;
  heading: string;
  text: string;
}

export interface ScoredChunk extends Chunk {
  score: number;
}

/**
 * Splits each markdown doc into chunks by heading (## sections), so results
 * point to a specific, citable part of a doc rather than the whole file.
 */
function loadChunks(): Chunk[] {
  const chunks: Chunk[] = [];
  const files = readdirSync(KB_DIR).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const raw = readFileSync(join(KB_DIR, file), "utf-8");
    const sections = raw.split(/\n(?=##\s)/g);

    sections.forEach((section, i) => {
      const headingMatch = section.match(/^#{1,2}\s+(.+)$/m);
      const heading = headingMatch ? headingMatch[1].trim() : file;
      chunks.push({
        id: `${file}#${i}`,
        source: file,
        heading,
        text: section.trim(),
      });
    });
  }
  return chunks;
}

const CHUNKS = loadChunks();

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Simple TF-IDF style scoring. Deliberately dependency-free and offline —
 * no embeddings API required to run the server. Swap in a real embeddings
 * call (Bedrock, OpenAI, Anthropic) behind this same function signature
 * for production use; see README "Extending this" section.
 */
function scoreChunk(queryTerms: string[], chunk: Chunk): number {
  const chunkTerms = tokenize(chunk.text + " " + chunk.heading);
  const chunkTermSet = new Set(chunkTerms);
  let score = 0;
  for (const term of queryTerms) {
    if (chunkTermSet.has(term)) {
      const freq = chunkTerms.filter((t) => t === term).length;
      score += freq * (chunk.heading.toLowerCase().includes(term) ? 2 : 1);
    }
  }
  return score;
}

export function search(query: string, topK = 3): ScoredChunk[] {
  const queryTerms = tokenize(query);
  const scored = CHUNKS.map((chunk) => ({
    ...chunk,
    score: scoreChunk(queryTerms, chunk),
  }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  return scored;
}

export function listSources(): string[] {
  return [...new Set(CHUNKS.map((c) => c.source))];
}
