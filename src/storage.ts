import fs from "node:fs/promises";
import path from "node:path";
import { ConfigSchema, type Config } from "./config.js";

/** Where the config file lives, relative to the user's current directory. */
export const CONFIG_FILE = "galya-sync.config.json";

/**
 * Save a config object to disk.
 * Validates against the schema first — refuses to write malformed data.
 */
export async function saveConfig(config: Config): Promise<string> {
  const validated = ConfigSchema.parse(config);
  const filePath = path.join(process.cwd(), CONFIG_FILE);
  await fs.writeFile(filePath, JSON.stringify(validated, null, 2), "utf-8");
  return filePath;
}

/**
 * Load and validate the config from disk.
 * Returns null if the file doesn't exist.
 * Throws if the file exists but is invalid.
 */
export async function loadConfig(): Promise<Config | null> {
  const filePath = path.join(process.cwd(), CONFIG_FILE);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }

  const parsed: unknown = JSON.parse(raw);
  return ConfigSchema.parse(parsed);
}

/**
 * Check whether a config file exists in the current directory.
 */
export async function configExists(): Promise<boolean> {
  const filePath = path.join(process.cwd(), CONFIG_FILE);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
