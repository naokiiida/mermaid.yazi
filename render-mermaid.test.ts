import { describe, test, expect } from "bun:test";
import { writeFileSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const script = join(import.meta.dir, "render-mermaid.ts");

function tmpFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "mermaid-test-"));
  const file = join(dir, "test.mmd");
  writeFileSync(file, content);
  return file;
}

describe("render-mermaid", () => {
  test("renders a valid flowchart to ASCII", async () => {
    const file = tmpFile("graph LR\n  A --> B --> C");
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
    expect(stdout).toContain("A");
    expect(stdout).toContain("B");
    expect(stdout).toContain("C");
  });

  test("renders a valid sequence diagram to ASCII", async () => {
    const file = tmpFile(
      "sequenceDiagram\n  Alice->>Bob: Hello\n  Bob->>Alice: Hi"
    );
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
    expect(stdout).toContain("Alice");
    expect(stdout).toContain("Bob");
  });

  test("exits with error when file does not exist", async () => {
    const proc = Bun.spawn(
      ["bun", "run", script, "--input", "/tmp/nonexistent-mermaid-file.mmd"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
    expect(stderr).toContain("Error");
  });

  test("exits with error when file is empty", async () => {
    const file = tmpFile("");
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
    expect(stderr).toContain("empty");
  });

  test("exits with error on invalid mermaid syntax", async () => {
    const file = tmpFile("this is not valid mermaid syntax at all!!!");
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).not.toBe(0);
    expect(stderr.length).toBeGreaterThan(0);
  });

  test("exits with error when --input argument is missing", async () => {
    const proc = Bun.spawn(["bun", "run", script], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(1);
    expect(stderr).toContain("--input");
  });
});
