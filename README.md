```markdown
# @galya/supabase-sync

CLI to sync Supabase tables into [Galya](https://galya.io) for taste-based search, reranking, and personalised recommendations.

> **Status:** Early preview. Setup + validate commands only. Full sync, backfill, and monitoring are in progress.

## Install

```bash
npm install -g @galya/supabase-sync
```

## Requirements

- Node.js 20+
- A [Supabase](https://supabase.com) project with a service role key
- A [Galya](https://galya.io) workspace key (`galya_wsk_...`)

## Quick start

```bash
# 1. Run the interactive setup wizard
galya-supabase-sync setup

# 2. Verify your credentials
galya-supabase-sync validate
```

The setup wizard writes a `galya-sync.config.json` file in the current directory. Run these commands from your project root.

## Commands

| Command | Description |
|---|---|
| `setup` | Interactive wizard to create `galya-sync.config.json` |
| `validate` | Check config shape, Supabase reachability, and Galya credentials |

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Unexpected error |
| `2` | Config missing or already exists |
| `3` | Credential / connectivity check failed |

## Configuration

The wizard produces a `galya-sync.config.json` in the current directory. Example:

```json
{
  "supabase": {
    "projectUrl": "https://xxxx.supabase.co",
    "serviceRoleKey": "eyJ...",
    "table": "items"
  },
  "galya": {
    "apiKey": "galya_wsk_...",
    "workspaceId": "optional-workspace-id"
  },
  "fields": {
    "id": "id",
    "url": "url",
    "type": "text"
  }
}
```

The `serviceRoleKey` and `apiKey` are stored in plain text. Keep this file out of version control — add it to `.gitignore`.

## License

MIT
