# CureCare Ecosystem — System Map & Component Index

> **Purpose**: Lean, high-density reference for instant lookup. Read this file **first** to avoid analyzing entire codebases or querying Docker from scratch.

---

## 1. Local Application Stack (Storefront & Catalog)

| Component | Technology | Location / Port | Description |
|---|---|---|---|
| **Server** | Node.js / Express | `server.js` (Port `3000`) | Main web server, API routes, multi-image upload (`/api/admin/upload-multiple`), single upload (`/api/admin/upload`), SSR/static delivery. |
| **Catalog Data** | SQLite DB | `database/curecare.db` | Master product catalog, stock counts, active states, multi-image galleries (`additional_images`). |
| **Admin CMS** | Vanilla SPA | `public/admin/` | 5-image gallery manager, HTML5 Canvas cropper, floating animated save status feedback, product variations builder. |
| **Storefront** | Vanilla HTML/JS | `public/` & `public/js/app.js` | 1-Click instant order modal, interactive thumbnail gallery switcher (`switchStorefrontDetailImage`). |
| **Public Assets** | Static Files | `public/` & `public/images/uploads/` | Logos, banners, uploaded product media images. |
| **Entry Point** | JavaScript | `index.js` | App bootstrap and environment initializers. |

---

## 2. Remote VPS Stack (Automation & AI Chatbot)

| Parameter | Value | Notes |
|---|---|---|
| **Host IP** | `2.25.75.30` | Hostname: `srv1797986` (Ubuntu 24.04.4 LTS) |
| **Stack Directory** | `/opt/vps-stack/` | Managed via Docker Compose |
| **n8n Container** | `n8n_workflow_engine` | Docker volume: `n8n_n8n_data` |
| **n8n SQLite DB** | `/var/lib/docker/volumes/n8n_n8n_data/_data/database.sqlite` | Tables: `workflow_entity`, `workflow_history`, `execution_entity` |
| **n8n Config** | `/var/lib/docker/volumes/n8n_n8n_data/_data/config` | Contains `encryptionKey` (32 bytes) for AES credentials |
| **Webhook Endpoint** | `https://saasflow.duckdns.org/webhook/facebook-messenger` | Handled by Caddy -> internal n8n port 5678 |
| **Webhook Verify Token** | `curecare_secret_2026` | Matches Meta Developer App Webhook settings |

---

## 3. Meta Messenger AI Chatbot Specification

- **Workflow Name**: `Meta Messenger AI Chatbot - Cure Care and Color Fiesta`
- **Workflow ID**: `m7pLnAyrevK5dHvv`
- **Active Gemini Model**: `models/gemini-2.5-flash` *(Do NOT use 3.1-flash-lite [503] or 1.5-flash [404])*
- **Gemini Credential ID**: `SwjFEuheRHaOM5mk`
- **Facebook Graph API Version**: `v19.0`

### Multi-Tenant Routing Table:
| Brand | Page ID | Agent Node ID | LLM Node ID | Reply Node ID |
|---|---|---|---|---|
| **Cure-Care** | `311099052086184` | `node-curecare-agent` | `node-gemini-model-cure` | `node-send-cure-reply` |
| **Color Fiesta** | `100083287040411` | `node-fiesta-agent` | `node-gemini-model-fiesta` | `node-send-fiesta-reply` |

*Real Test Customer PSID for Cure-Care*: `28765162506426793`

---

## 4. Upstream Template Replication for Color Fiesta

CureCare is the authoritative template for Color Fiesta. All backend APIs, database migrations, 5-image gallery managers, image croppers, and save status popups are documented for 1-to-1 copy-paste replication:

- **Master Replication Blueprint**: [`docs/COLOR_FIESTA_MIGRATION_BLUEPRINT.md`](./COLOR_FIESTA_MIGRATION_BLUEPRINT.md)
- **Target Repository**: `D:\Dev stuff\Rebel mama\Color fiesta`

---

## 5. Instant Diagnostic Cheatsheet (Copy-Paste)

### A. Check Last 3 Executions (Direct SQLite Query)
```python
import sqlite3
c = sqlite3.connect('/var/lib/docker/volumes/n8n_n8n_data/_data/database.sqlite').cursor()
for r in c.execute('SELECT id, workflowId, status, startedAt, stoppedAt FROM execution_entity WHERE workflowId="m7pLnAyrevK5dHvv" ORDER BY id DESC LIMIT 3').fetchall():
    print(r)
```

### B. Trigger Instant Test Webhook with Real PSID
```bash
curl -s -X POST "http://127.0.0.1:5678/webhook/facebook-messenger" \
  -H "Content-Type: application/json" \
  -d '{"object":"page","entry":[{"id":"311099052086184","messaging":[{"sender":{"id":"28765162506426793"},"recipient":{"id":"311099052086184"},"message":{"text":"hello"}}]}]}'
```

### C. Safe n8n Container Restart
```bash
docker restart n8n_workflow_engine
```
