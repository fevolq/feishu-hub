import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = path.resolve(process.cwd(), "src");

const listSourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });

const importsIn = (file: string) => {
  const source = fs.readFileSync(file, "utf8");
  return [...source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)].map(
    (match) => match[1]
  );
};

describe("module dependency boundaries", () => {
  it("keeps removed layer-first source roots from returning", () => {
    expect(fs.existsSync(path.join(sourceRoot, "server"))).toBe(false);
    expect(fs.existsSync(path.join(sourceRoot, "features"))).toBe(false);
    expect(fs.existsSync(path.join(sourceRoot, "lib"))).toBe(false);
  });

  it("keeps domain modules independent from infrastructure and UI frameworks", () => {
    const violations = listSourceFiles(path.join(sourceRoot, "modules"))
      .filter((file) => file.replaceAll("\\", "/").includes("/domain/"))
      .flatMap((file) =>
        importsIn(file)
          .filter((specifier) =>
            /^(next|react|@arco-design|better-sqlite3|@\/shared\/server|@\/modules\/[^/]+\/server)/.test(
              specifier
            )
          )
          .map((specifier) => `${path.relative(sourceRoot, file)} -> ${specifier}`)
      );

    expect(violations).toEqual([]);
  });

  it("prevents shared code from depending on business modules", () => {
    const violations = listSourceFiles(path.join(sourceRoot, "shared")).flatMap((file) =>
      importsIn(file)
        .filter((specifier) => specifier.startsWith("@/modules/"))
        .map((specifier) => `${path.relative(sourceRoot, file)} -> ${specifier}`)
    );

    expect(violations).toEqual([]);
  });

  it("prevents imports through removed compatibility aliases", () => {
    const violations = listSourceFiles(sourceRoot).flatMap((file) =>
      importsIn(file)
        .filter((specifier) => /^@\/(server|features|lib)(\/|$)/.test(specifier))
        .map((specifier) => `${path.relative(sourceRoot, file)} -> ${specifier}`)
    );

    expect(violations).toEqual([]);
  });
});
