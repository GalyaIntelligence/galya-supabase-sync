import fs from "node:fs/promises";
import path from "node:path";
import type { Config } from "./config.js";
import {
  SYNC_FUNCTION_TEMPLATE,
  RERANK_FUNCTION_TEMPLATE,
  TRIGGER_SQL_TEMPLATE,
} from "./templates/index.js";

export type GenerateResult = {
  syncFunction: string;
  rerankFunction: string;
  triggerSql: string;
};

/**
 * Fill all placeholders in a template string with values from config.
 */
function fill(template: string, config: Config): string {
  const table = config.supabase.table;
  const fieldUrl = config.fields.url;
  const fieldId = config.fields.id;
  const fieldTitle = config.fields.title ?? "";
  const fieldDesc = config.fields.description ?? "";
  const contentType = config.fields.type;
  const projectUrl = config.supabase.projectUrl;
  const serviceRoleKey = config.supabase.serviceRoleKey;

  // Optional fields: include the column name prefixed with ", " if configured
  const optionalTitle = fieldTitle ? `, ${fieldTitle}` : "";
  const optionalDesc = fieldDesc ? `, ${fieldDesc}` : "";
  
  // Replace the full extraction line if the field is not configured
const titleExtraction = fieldTitle
  ? `const title = String(record["${fieldTitle}"] ?? "");`
  : `const title = ""; // title field not configured`;

const descExtraction = fieldDesc
  ? `const description = String(record["${fieldDesc}"] ?? "");`
  : `const description = ""; // description field not configured`;


  return template
    .replaceAll("__TABLE__", table)
    .replaceAll("__FIELD_URL__", fieldUrl)
    .replaceAll("__FIELD_ID__", fieldId)
    .replaceAll("__TITLE_EXTRACTION__", titleExtraction)
    .replaceAll("__DESC_EXTRACTION__", descExtraction)
    .replaceAll("__FIELD_TITLE__", fieldTitle)
    .replaceAll("__FIELD_DESC__", fieldDesc)
    .replaceAll("__CONTENT_TYPE__", contentType)
    .replaceAll("__PROJECT_URL__", projectUrl)
    .replaceAll("__SERVICE_ROLE_KEY__", serviceRoleKey)
    .replaceAll("__OPTIONAL_TITLE__", optionalTitle)
    .replaceAll("__OPTIONAL_DESC__", optionalDesc);
}

/**
 * Generate Edge Functions and SQL trigger from config.
 * Writes files into the developer's project directory (outputDir).
 * Returns the paths of all generated files.
 */
export async function generate(
  config: Config,
  outputDir: string = process.cwd()
): Promise<GenerateResult> {
  const table = config.supabase.table;

  const syncFunctionDir = path.join(
    outputDir,
    "supabase",
    "functions",
    `galya-sync-${table}`
  );
  const rerankFunctionDir = path.join(
    outputDir,
    "supabase",
    "functions",
    `galya-rerank-${table}`
  );
  const migrationsDir = path.join(outputDir, "supabase", "migrations");

  // Create all directories
  await fs.mkdir(syncFunctionDir, { recursive: true });
  await fs.mkdir(rerankFunctionDir, { recursive: true });
  await fs.mkdir(migrationsDir, { recursive: true });

  // Fill templates and write files
  const syncPath = path.join(syncFunctionDir, "index.ts");
  const rerankPath = path.join(rerankFunctionDir, "index.ts");
  const timestamp = new Date()
  .toISOString()
  .replace(/[-:T.]/g, "")
  .slice(0, 14); // e.g. "20260730110500"
const sqlPath = path.join(
  migrationsDir,
  `${timestamp}_galya_sync_trigger.sql`
);

  await fs.writeFile(syncPath, fill(SYNC_FUNCTION_TEMPLATE, config), "utf-8");
  await fs.writeFile(rerankPath, fill(RERANK_FUNCTION_TEMPLATE, config), "utf-8");
  await fs.writeFile(sqlPath, fill(TRIGGER_SQL_TEMPLATE, config), "utf-8");

  return {
    syncFunction: syncPath,
    rerankFunction: rerankPath,
    triggerSql: sqlPath,
  };
}
