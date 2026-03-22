import { readFileSync, existsSync } from "fs";
import { parseArgs } from "util";
import { renderMermaidAscii } from "beautiful-mermaid";

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

try {
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
  const result = renderMermaidAscii(diagram, opts);

  // Truncate lines to fit panel width if specified
  if (w > 0) {
    const lines = result.split("\n");
    const truncated = lines.map((line: string) => {
      if (line.length > w) {
        return line.slice(0, w);
      }
      return line;
    });
    process.stdout.write(truncated.join("\n"));
  } else {
    process.stdout.write(result);
  }
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`Error: rendering failed: ${msg}`);
  process.exit(2);
}
