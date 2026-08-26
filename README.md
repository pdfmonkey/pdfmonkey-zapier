# PDFMonkey — Zapier integration

Generate PDF documents from your [PDFMonkey](https://www.pdfmonkey.io) templates
inside a Zap, and react when a document finishes generating.

## What it does

### Triggers

- **Document Generated** — instant (REST hook) trigger that fires when a
  document finishes generating successfully. Optionally scoped to one or more
  templates.

### Actions

- **Generate Document** — creates a document from a template and returns it once
  generation completes. Because generation can take longer than Zapier's ~30 s
  synchronous limit, the action runs asynchronously: it registers a per-run,
  channel-scoped webhook, hands Zapier a callback URL, and resumes the Task when
  PDFMonkey notifies that the document is ready. Testing the step in the Zap
  editor generates a real document too, but waits for it by polling: the editor
  never resumes a callback during setup. Data can be provided either as a visual
  Zapier mapping or as a raw JSON payload, with optional line items.
- **Delete Document** — deletes a document by ID.

### Searches

- **Find Document** — looks up a document by ID.

## Authentication

API-key based. Users paste their **Secret Key** from the PDFMonkey
[account page](https://dashboard.pdfmonkey.io/account); every request is sent as
a `Bearer` token against `https://api.pdfmonkey.io`.

## Development

```bash
npm install       # install dependencies
npm test          # run the Jest suite
zapier test       # run the suite through the Zapier CLI
zapier push       # push a new version to Zapier
```

Requires Node 20+ (matches the `zapier-platform-core` Lambda runtime).

## Project layout

| Path            | Contents                                              |
| --------------- | ----------------------------------------------------- |
| `authentication.js` | API-key auth definition                           |
| `triggers/`     | Document Generated (instant + legacy polling), workspace/template dropdowns |
| `actions/`      | Generate Document, Delete Document                    |
| `searches/`     | Find Document                                          |
| `lib/`          | Shared helpers (e.g. document JSON parsing)            |
| `mappings/`     | Output field definitions                               |
| `samples/`      | Sample records for the Zap editor                      |
| `test/`         | Jest specs (mocked with `nock`)                        |

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
