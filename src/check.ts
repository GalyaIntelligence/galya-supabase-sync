import type { Config } from "./config.js";

/**
 * Build Supabase REST API auth headers.
 * - Legacy JWT keys (eyJ...) go in both `apikey` and `Authorization: Bearer`.
 * - New keys (sb_secret_...) go in `apikey` only. `Authorization` is reserved
 *   for user session JWTs and PostgREST rejects non-JWTs there.
 */
function supabaseAuthHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: key };
  if (key.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export type CheckResult = {
  ok: boolean;
  message: string;
};

/**
 * Verify Supabase credentials by making a lightweight authenticated request.
 * We hit the REST API and expect a non-401 response.
 */
export async function checkSupabase(config: Config): Promise<CheckResult> {
  const url = `${config.supabase.projectUrl}/rest/v1/${config.supabase.table}?select=*&limit=1`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: supabaseAuthHeaders(config.supabase.serviceRoleKey),
         });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Supabase rejected the service role key (HTTP ${res.status})`,
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message: `Supabase table '${config.supabase.table}' not found (HTTP 404)`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Supabase returned HTTP ${res.status}`,
      };
    }
    return { ok: true, message: `Supabase reachable, table '${config.supabase.table}' found` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Could not reach Supabase: ${msg}` };
  }
}
/**
 * Verify Galya credentials by calling a cheap authenticated endpoint.
 * GET /v1/entity/type is a safe read-only call that requires a valid API key.
 */
export async function checkGalya(config: Config): Promise<CheckResult> {
  const baseUrl = "https://api.galya.io/v1";
  const url = `${baseUrl}/clusters?limit=1`
  try {
    const headers: Record<string, string> = {
      "X-API-Key": config.galya.apiKey,
    };
    if (config.galya.workspaceId) {
      headers["X-Galya-Workspace-Id"] = config.galya.workspaceId;
    }
    const res = await fetch(url, { method: "GET", headers });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Galya rejected the API key (HTTP ${res.status})`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Galya returned HTTP ${res.status}`,
      };
    }
    return { ok: true, message: "Galya API key accepted" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Could not reach Galya: ${msg}` };
  }
}

