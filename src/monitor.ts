import { createClient } from "@supabase/supabase-js";
import type { Config } from "./config.js";

const GALYA_BASE = "https://api.galya.io/v1";

/**
 * Stream recent Edge Function logs for the sync function.
 * Requires Supabase CLI + linked project.
 */
export async function streamLogs(
  config: Config,
  _cwd: string
): Promise<void> {
  const table = config.supabase.table;
  const ref = new URL(config.supabase.projectUrl).hostname.split(".")[0];

  console.log(`The Supabase CLI no longer supports streaming function logs directly.`);
  console.log(`View logs for galya-sync-${table} in the Dashboard:`);
  console.log(`  https://supabase.com/dashboard/project/${ref}/functions/galya-sync-${table}/logs`);
}

/**
 * Look up a row in Supabase and check if it's indexed in Galya.
 */
export async function inspectRecord(
  config: Config,
  recordId: string
): Promise<void> {
  const supabase = createClient(
    config.supabase.projectUrl,
    config.supabase.serviceRoleKey,
    { auth: { persistSession: false } }
  );

  // 1. Find the row in Supabase
  const { data: rows, error } = await supabase
    .from(config.supabase.table)
    .select("*")
    .eq(config.fields.id, recordId)
    .limit(1);

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`);
  }

  if (!rows?.length) {
    console.log(`✗ Row '${recordId}' not found in table '${config.supabase.table}'`);
    return;
  }

  const row = rows[0] as Record<string, unknown>;
  console.log(`✓ Found in Supabase:`);
  console.log(`  ${config.fields.id}: ${row[config.fields.id]}`);
  console.log(`  ${config.fields.url}: ${row[config.fields.url]}`);

  // 2. Check if it's indexed in Galya
  const url = String(row[config.fields.url] ?? "");
  if (!url) {
    console.log(`✗ URL field '${config.fields.url}' is empty — cannot check Galya`);
    return;
  }

  const headers: Record<string, string> = {
    "X-API-Key": config.galya.apiKey,
  };
  if (config.galya.workspaceId) {
    headers["X-Galya-Workspace-Id"] = config.galya.workspaceId;
  }

  const galyaRes = await fetch(
    `${GALYA_BASE}/entity?entity_id=${encodeURIComponent(url)}`,
    { method: "GET", headers }
  );

  if (galyaRes.status === 404) {
    console.log(`✗ Not indexed in Galya yet`);
    console.log(`  URL: ${url}`);
    console.log(`  Tip: run 'galya-supabase-sync backfill --limit 1' or wait for the trigger to fire`);
    return;
  }

  if (!galyaRes.ok) {
    const body = await galyaRes.text().catch(() => "");
    console.log(`✗ Galya returned HTTP ${galyaRes.status}: ${body.slice(0, 200)}`);
    return;
  }

  const entity = await galyaRes.json() as Record<string, unknown>;
  console.log(`✓ Indexed in Galya:`);
  console.log(`  entity_id: ${entity["entity_id"] ?? entity["id"]}`);
  console.log(`  url: ${url}`);
}
