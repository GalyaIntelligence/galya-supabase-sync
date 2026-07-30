import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";
import type { Config } from "./config.js";

/**
 * Extract the Supabase project reference ID from a project URL.
 * e.g. "https://xxxx.supabase.co" → "xxxx"
 */
function extractProjectRef(projectUrl: string): string {
  const host = new URL(projectUrl).hostname;
  return host.split(".")[0];
}

/**
 * Check the Supabase CLI is installed.
 * Throws a clear error if not found.
 */
export async function checkSupabaseCli(): Promise<void> {
  try {
    await execa("supabase", ["--version"]);
  } catch {
    throw new Error(
      "Supabase CLI not found. Install it first:\n" +
        "  brew install supabase/tap/supabase\n" +
        "  or: https://supabase.com/docs/guides/cli"
    );
  }
}

/**
 * Check the project is linked (supabase link has been run).
 * Returns the project ref if linked, throws if not.
 */
export async function checkProjectLinked(
  config: Config,
  cwd: string
): Promise<string> {
  const projectRef = extractProjectRef(config.supabase.projectUrl);
  const tempRefFile = path.join(cwd, "supabase", ".temp", "project-ref");

  try {
    const linkedRef = (await fs.readFile(tempRefFile, "utf-8")).trim();
    if (linkedRef !== projectRef) {
      throw new Error(
        `Project linked to '${linkedRef}' but config points to '${projectRef}'.\n` +
          `Run: supabase link --project-ref ${projectRef}`
      );
    }
    return projectRef;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Supabase project not linked yet.\n` +
          `Run this first: supabase link --project-ref ${projectRef}\n` +
          `(You can find your project ref in your Supabase dashboard URL)`
      );
    }
    throw err;
  }
}

/**
 * Set Galya credentials as Supabase secrets.
 */
export async function setSecrets(
  config: Config,
  cwd: string
): Promise<void> {
  const secrets = [`GALYA_API_KEY=${config.galya.apiKey}`];
  if (config.galya.workspaceId) {
    secrets.push(`GALYA_WORKSPACE_ID=${config.galya.workspaceId}`);
  }

  await execa("supabase", ["secrets", "set", ...secrets], {
    cwd,
    stdio: "inherit",
  });
}

/**
 * Deploy both Edge Functions.
 */
export async function deployFunctions(
  config: Config,
  cwd: string
): Promise<void> {
  const table = config.supabase.table;

  await execa(
    "supabase",
    ["functions", "deploy", `galya-sync-${table}`, "--no-verify-jwt"],
    { cwd, stdio: "inherit" }
  );

  await execa(
    "supabase",
    ["functions", "deploy", `galya-rerank-${table}`, "--no-verify-jwt"],
    { cwd, stdio: "inherit" }
  );
}

/**
 * Push the SQL migration to create the trigger.
 */
export async function pushMigration(cwd: string): Promise<void> {
  await execa("supabase", ["db", "push"], {
    cwd,
    stdio: "inherit",
  });
}
