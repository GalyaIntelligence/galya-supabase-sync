import { createClient } from "@supabase/supabase-js";
import type { Config } from "./config.js";

const GALYA_BASE = "https://api.galya.io/v1";
const BATCH_SIZE = 100;

export type BackfillResult = {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ rowId: unknown; error: string }>;
};

function galyaHeaders(config: Config): Record<string, string> {
  const headers: Record<string, string> = {
    "X-API-Key": config.galya.apiKey,
    "Content-Type": "application/json",
  };
  if (config.galya.workspaceId) {
    headers["X-Galya-Workspace-Id"] = config.galya.workspaceId;
  }
  return headers;
}

async function indexRow(
  config: Config,
  row: Record<string, unknown>
): Promise<void> {
  const url = String(row[config.fields.url] ?? "");
  const title = config.fields.title
    ? String(row[config.fields.title] ?? "")
    : "";
  const description = config.fields.description
    ? String(row[config.fields.description] ?? "")
    : "";
  const content =
    [title, description].filter(Boolean).join(". ").trim() || url;

  const res = await fetch(`${GALYA_BASE}/index`, {
    method: "POST",
    headers: galyaHeaders(config),
    body: JSON.stringify({
      content: { url, type: config.fields.type, content },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
}

/**
 * Backfill existing rows from the configured Supabase table into Galya.
 * Reads in batches of BATCH_SIZE, indexes each row one at a time.
 * Continues on individual row failures — reports them at the end.
 *
 * @param config  The loaded CLI config
 * @param limit   Optional max rows to index (for testing)
 */
export async function backfill(
  config: Config,
  limit?: number
): Promise<BackfillResult> {
  const supabase = createClient(
    config.supabase.projectUrl,
    config.supabase.serviceRoleKey,
    { auth: { persistSession: false } }
  );

  // Count how many rows exist before starting
  const { count, error: countError } = await supabase
    .from(config.supabase.table)
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Could not count rows: ${countError.message}`);
  }

  const totalRows = limit
    ? Math.min(limit, count ?? 0)
    : (count ?? 0);

  if (totalRows === 0) {
    return { total: 0, succeeded: 0, failed: 0, errors: [] };
  }

  const result: BackfillResult = {
    total: totalRows,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  let from = 0;

  while (from < totalRows) {
    const to = Math.min(from + BATCH_SIZE - 1, totalRows - 1);

    const { data: rows, error } = await supabase
      .from(config.supabase.table)
      .select("*")
      .range(from, to);

    if (error) {
      throw new Error(`Could not read rows ${from}–${to}: ${error.message}`);
    }

    for (const row of rows ?? []) {
      const typed = row as Record<string, unknown>;
      try {
        await indexRow(config, typed);
        result.succeeded++;
      } catch (err) {
        result.failed++;
        result.errors.push({
          rowId: typed[config.fields.id],
          error: err instanceof Error ? err.message : String(err),
        });
      }
      // Overwrite same line to show live progress
      process.stdout.write(
        `\r  Indexed ${result.succeeded + result.failed} / ${totalRows}`
      );
    }

    from = to + 1;
  }

  process.stdout.write("\n");
  return result;
}
