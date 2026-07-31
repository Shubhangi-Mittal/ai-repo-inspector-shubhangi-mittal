import { execFileSync } from "node:child_process";
import type { ChangedFile } from "./types.js";

function git(repositoryPath: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repositoryPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function resolveDefaultBaseRef(repositoryPath: string): string {
  try {
    const symbolic = git(repositoryPath, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
    return symbolic.replace(/^origin\//, "");
  } catch {
    // No origin/HEAD (e.g. a local-only repo) — fall through to local branch checks.
  }

  for (const candidate of ["main", "master"]) {
    try {
      git(repositoryPath, ["show-ref", "--verify", `refs/heads/${candidate}`]);
      return candidate;
    } catch {
      // Candidate branch doesn't exist — try the next one.
    }
  }

  throw new Error(
    "Could not determine a default base ref (no origin/HEAD, and neither 'main' nor 'master' exist locally). Pass --base-ref explicitly.",
  );
}

export function changedFiles(repositoryPath: string, baseRef?: string): ChangedFile[] {
  const base = baseRef ?? resolveDefaultBaseRef(repositoryPath);
  const output = git(repositoryPath, ["diff", "--name-status", `${base}...HEAD`]);

  const committed: ChangedFile[] = output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [code, ...pathParts] = line.split("\t");
      const status = code === "A" ? "added" : code === "D" ? "deleted" : "modified";
      return { path: pathParts.join("\t"), status };
    });

  const untrackedOutput = git(repositoryPath, ["ls-files", "--others", "--exclude-standard"]);
  const untracked: ChangedFile[] = untrackedOutput
    .split("\n")
    .filter(Boolean)
    .map((path) => ({ path, status: "untracked" as const }));

  return [...committed, ...untracked];
}