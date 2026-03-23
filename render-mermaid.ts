import { readFileSync, existsSync } from "fs";
import { parseArgs } from "util";
import { renderMermaidAscii, displayWidth, clipToDisplayWidth } from "beautiful-mermaid";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    input: { type: "string" },
    width: { type: "string" },
    height: { type: "string" },
  },
  strict: true,
});

if (!values.input) {
  console.error("Error: --input <file> is required");
  process.exit(1);
}

if (!existsSync(values.input)) {
  console.error(`Error: file not found: ${values.input}`);
  process.exit(1);
}

const content = readFileSync(values.input, "utf-8");

if (content.trim() === "") {
  console.error("Error: file is empty");
  process.exit(1);
}

// Strip YAML frontmatter if present
let diagram = content;
if (content.startsWith("---")) {
  const end = content.indexOf("\n---\n", 3);
  if (end !== -1) {
    diagram = content.slice(end + 4).trimStart();
  }
}

// Sanitize diagram for beautiful-mermaid compatibility
function sanitize(src: string): string {
  return src
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      // Strip classDef/class (styling-only, no ASCII equivalent)
      if (/^classDef\s/.test(trimmed)) return false;
      if (/^class\s/.test(trimmed)) return false;
      // Strip mermaid comments
      if (trimmed.startsWith("%%")) return false;
      return true;
    })
    .map((line) => line.replace(/<br\s*\/?>/gi, " "))
    .join("\n");
}

// Strip dotted/dashed arrows which can cause layout failures on complex graphs
function stripDottedArrows(src: string): string {
  return src
    .split("\n")
    .filter((line) => !/\S\s+[-.]+-\.->/.test(line) && !/\S\s+-.->/.test(line))
    .join("\n");
}

const opts: { paddingX?: number; paddingY?: number; boxBorderPadding?: number } = {};
const w = values.width ? parseInt(values.width, 10) : 0;
if (w > 0) {
  if (w < 60) {
    opts.paddingX = 1;
    opts.paddingY = 0;
    opts.boxBorderPadding = 0;
  } else if (w < 120) {
    opts.paddingX = 2;
    opts.paddingY = 1;
    opts.boxBorderPadding = 1;
  } else {
    opts.paddingX = 5;
    opts.paddingY = 3;
    opts.boxBorderPadding = 1;
  }
}

function truncateOutput(result: string, width: number): string {
  if (width <= 0) return result;
  return result
    .split("\n")
    .map((line: string) =>
      displayWidth(line) > width ? clipToDisplayWidth(line, width) : line
    )
    .join("\n");
}

// Try rendering with progressive fallbacks
const sanitized = sanitize(diagram);
let result: string | null = null;
let lastError: string = "";

// Pass 1: sanitized diagram (classDef/class/comments stripped, <br/> cleaned)
try {
  result = renderMermaidAscii(sanitized, opts);
} catch (err: unknown) {
  lastError = err instanceof Error ? err.message : String(err);
}

// Pass 2: also strip dotted arrows (-.-> can break grid layout on complex graphs)
if (result === null) {
  try {
    result = renderMermaidAscii(stripDottedArrows(sanitized), opts);
  } catch (err: unknown) {
    lastError = err instanceof Error ? err.message : String(err);
  }
}

if (result !== null) {
  process.stdout.write(truncateOutput(result, w));
} else {
  console.error(`Error: rendering failed: ${lastError}`);
  process.exit(2);
}
