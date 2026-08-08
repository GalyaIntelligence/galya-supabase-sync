# @galya/supabase-sync

CLI to sync Supabase tables into [Galya](https://galya.io) for taste-based search, reranking, and personalised recommendations.

> **Status:** Early preview — core commands are working. End-to-end testing in progress.

## Install

```bash
npm install -g @galya/supabase-sync
```

## Requirements

- Node.js 20+
- A [Supabase](https://supabase.com) project with a **Secret API Key** (`sb_secret_...`) or legacy service role key
- A [Galya](https://galya.io) workspace key (`galya_wsk_...`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (required for `deploy` and `logs`)

## Quick start

```bash
# 1. Run the interactive setup wizard
galya-supabase-sync setup

# 2. Verify credentials
galya-supabase-sync validate

# 3. Link your Supabase project (required before deploy)
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy everything in one command
galya-supabase-sync deploy
```

After deploy, every INSERT / UPDATE / DELETE on your configured table automatically syncs to Galya.

## Commands

### `setup`

Interactive wizard that creates `galya-sync.config.json` in the current directory.

```bash
galya-supabase-sync setup
```

Asks for:
- Supabase project URL + service role key
- Table name to sync
- Galya API key + optional workspace ID
- Field mapping (which columns map to id, url, title, description)
- Content type (text / image / audio / video)
- - Content domain (restaurants / travel / ecommerce / uiux / fashion / conversation / professional)

---

### `validate`

Check that your config is valid and credentials work.

```bash
galya-supabase-sync validate
```

Verifies:
- `galya-sync.config.json` exists and is well-formed
- Supabase project is reachable and the table exists
- Galya API key is accepted

---

### `generate`

Generate the Supabase Edge Functions and SQL trigger from your config. Does not deploy.

```bash
galya-supabase-sync generate
```

Produces:
```
supabase/
├── functions/
│   ├── galya-sync-{table}/index.ts       ← syncs changes to Galya
│   └── galya-rerank-{table}/index.ts     ← reranks catalog by user taste
└── migrations/
    └── <timestamp>_galya_sync_trigger.sql            ← Postgres trigger
```

⚠️  Add `galya_sync_trigger.sql` to your `.gitignore` as it contains your service role key.

---

### `deploy`

Generate files, set Supabase secrets, deploy Edge Functions, and push the SQL trigger all in one command.

```bash
galya-supabase-sync deploy
```

Requires:
- Supabase CLI installed
- Project linked (`supabase link --project-ref YOUR_REF`)

---

### `backfill`

Sync all existing rows from your Supabase table into Galya. The trigger only fires on new changes, use this to index data that existed before deployment.

```bash
galya-supabase-sync backfill

# Test with a small batch first
galya-supabase-sync backfill --limit 10
```

Reads in batches of 100, continues on individual row failures, and reports a summary at the end.

---

### `status`

Show current config and live credential health.

```bash
galya-supabase-sync status
```

Prints your config summary and runs live checks against Supabase and Galya.

---

### `logs`

Prints a direct link to the Edge Function logs in the Supabase Dashboard.

```bash
galya-supabase-sync logs
```

Requires Supabase CLI + linked project. Shows recent invocations, errors, and console output from inside the Edge Function.

---

### `inspect <id>`

Check whether a specific row is indexed in Galya.

```bash
galya-supabase-sync inspect abc-123
```

Looks up the row in Supabase by its ID, then checks if its URL is indexed in Galya. Useful when a specific item isn't appearing in search or rerank results.

---

## Developer workflow

```
setup
  └── validate
        └── deploy (or: generate → review → deploy)
              └── backfill (for existing data)
                    └── status / logs / inspect (ongoing monitoring)
```

---

## Configuration

The wizard writes `galya-sync.config.json` in the current directory:

```json
{
  "supabase": {
    "projectUrl": "https://xxxx.supabase.co",
    "serviceRoleKey": "sb_secret_...",
    "table": "recipes"
  },
  "galya": {
    "apiKey": "galya_wsk_...",
    "workspaceId": "optional-workspace-id"
  },
  "fields": {
    "id": "id",
    "url": "url",
    "title": "title",
    "description": "description",
    "type": "text",
    "domain": "ecommerce"
  }
}
```

⚠️ `serviceRoleKey` and `apiKey` are stored in plain text. Add `galya-sync.config.json` to your `.gitignore`.

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Unexpected error |
| `2` | Config missing or already exists |
| `3` | Credential check failed / partial backfill failure |

---

## How the sync works

```
Supabase table row changes
         │
         ▼
Postgres trigger fires
         │
         ▼
galya-sync-{table} Edge Function
         │
         ├── INSERT / UPDATE → POST /v1/entity (Galya indexes the row)
         └── DELETE          → DELETE /v1/entity (Galya removes the row)
```

For reranking:

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/galya-rerank-{table} \
  -H "Authorization: Bearer YOUR_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-entity-id"}'
```

Returns your catalog rows reordered by that user's taste profile.

---

## License

MIT
