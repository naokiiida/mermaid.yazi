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

// ============================================================================
// CJK / fullwidth character e2e tests
// ============================================================================

describe("CJK rendering", () => {
  test("stadium shape with CJK labels", async () => {
    const file = tmpFile("flowchart TD\n  A([開始]) --> B([完了])");
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain("開始");
    expect(stdout).toContain("完了");
  });

  test("cylinder shape with CJK label", async () => {
    const file = tmpFile("flowchart TD\n  A[(データベース)]");
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain("データベース");
  });

  test("subroutine shape with CJK label", async () => {
    const file = tmpFile("flowchart TD\n  A[[サブルーチン処理]]");
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain("サブルーチン処理");
  });

  test("subgraph with CJK label renders without crash", async () => {
    const file = tmpFile(
      "flowchart TD\n  subgraph データ処理\n    A[入力] --> B[出力]\n  end"
    );
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);
    expect(stdout).toContain("入力");
    expect(stdout).toContain("出力");
  });

  test("no NUL characters leak into output", async () => {
    const file = tmpFile(
      "flowchart LR\n  A[請求レビュー] --> B[プロジェクトメンバー]"
    );
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).not.toContain("\x00");
  });

  test("adjacent CJK labels are not corrupted", async () => {
    const file = tmpFile(
      "flowchart LR\n  A[請求レビュー] --> B[プロジェクトメンバー]"
    );
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain("請求レビュー");
    expect(stdout).toContain("プロジェクトメンバー");
  });

  test("complex real-world CJK diagram with mixed shapes", async () => {
    const diagram = `flowchart TB
    Start([開始]) --> Step1
    subgraph Step1
        S1[Zoom録画情報取得] --> S1_Out[Sheet書き込み]
    end
    Step1 --> Step2
    subgraph Step2
        S2{新規行検出?} -->|Yes| S2_DL[ダウンロード]
        S2_DL --> S2_Up[Driveアップロード]
        S2 -->|No| S2_W[待機]
    end
    Step2 --> Step3
    Step3 --> End([完了])
    ZoomAPI[(Zoom Cloud)]
    GDrive[(Google Drive)]`;

    const file = tmpFile(diagram);
    const proc = Bun.spawn(["bun", "run", script, "--input", file], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout).toContain("開始");
    expect(stdout).toContain("完了");
    expect(stdout).toContain("ダウンロード");
    expect(stdout).not.toContain("\x00");
  });

  test("truncateOutput respects CJK display width", async () => {
    // Width 40: CJK chars are 2 columns each, so truncation must account for that
    const file = tmpFile(
      "flowchart LR\n  A[日本語テストデータ入力画面] --> B[中国語テストデータ出力画面]"
    );
    const proc = Bun.spawn(
      ["bun", "run", script, "--input", file, "--width", "40"],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );
    const stdout = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    expect(exitCode).toBe(0);
    expect(stdout.length).toBeGreaterThan(0);

    // Import displayWidth to verify line widths
    const { displayWidth } = await import("beautiful-mermaid");
    const lines = stdout.split("\n");
    for (const line of lines) {
      // Every line's display width should not exceed 40
      expect(displayWidth(line)).toBeLessThanOrEqual(40);
    }
  });
});
