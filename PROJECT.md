# CureCare & VPS Ecosystem — Master Project Documentation

**Project Name**: CureCare E-Commerce Platform & Automated AI Ecosystem  
**Last Updated**: October 25, 2026  
**Status**: Fully Operational & Documented  
**Operating Directive**: See [`AGENTS.md`](./AGENTS.md) and [`docs/SYSTEM_MAP.md`](./docs/SYSTEM_MAP.md) for instant context lookup rules to eliminate token waste.

---

## 1. System Architecture Overview

The system consists of two primary operational components:

```
+-----------------------------------------------------------------------------------+
|                                  CURECARE ECOSYSTEM                                |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   1. WEB APPLICATION (Next.js 14)          2. AUTOMATION & AI STACK (VPS)        |
|      - Responsive E-Commerce Storefront       - Host: 2.25.75.30 (Ubuntu 24.04)   |
|      - Admin Catalog & Stock Management       - Stack: /opt/vps-stack (Docker)    |
|      - Image Uploads & Product Activations    - n8n Workflow Engine (v2.28.4)     |
|      - Dynamic PDP & SEO Enhancements         - Multi-Tenant Meta Messenger AI    |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Meta Messenger AI Chatbot (VPS Infrastructure)

### 2.1 VPS Server Specifications
- **Public IP**: `2.25.75.30` (`srv1797986`)
- **OS**: Ubuntu 24.04.4 LTS
- **Stack Directory**: `/opt/vps-stack`
- **Reverse Proxy**: Caddy (SSL automated via Let's Encrypt / DuckDNS)
- **Engine**: n8n Workflow Engine (`n8n_workflow_engine` container)
- **Database**: SQLite (`/var/lib/docker/volumes/n8n_n8n_data/_data/database.sqlite`)

### 2.2 Chatbot Workflow Details
- **Workflow Name**: `Meta Messenger AI Chatbot - Cure Care and Color Fiesta`
- **Workflow ID**: `m7pLnAyrevK5dHvv`
- **Webhook Endpoints**:
  - Verification: `GET https://saasflow.duckdns.org/webhook/facebook-messenger`
  - Ingestion: `POST https://saasflow.duckdns.org/webhook/facebook-messenger`
- **Verification Token**: `curecare_secret_2026`
- **Meta Graph API Version**: `v19.0`

### 2.3 Multi-Tenant Page Routing
The webhook handles customer messages from multiple Facebook Pages using an automated `Page Router` switch:
1. **Cure-Care Bangladesh**:
   - Facebook Page ID: `311099052086184`
   - Agent Node: `Cure-Care AI Agent` (`node-curecare-agent`)
   - Persona: Empathetic Natural Health & Pain-Relief Consultant
   - Language: Warm, natural conversational Bengali (বাংলা)
   - Product Catalog: Herbal Balms (Crocodile, Siam Tiger, Lemongrass), Castor Oil, Hong Thai Inhaler, Cold-Pressed Oils, Skin Care
   - Dispatch Node: `Send Reply to Cure-Care User` -> `https://graph.facebook.com/v19.0/me/messages`
2. **Color Fiesta**:
   - Facebook Page ID: `100083287040411`
   - Agent Node: `Color Fiesta AI Agent`
   - Persona: Bangladeshi traditional foods, snacks, and gourmet condiments
   - Dispatch Node: `Send Reply to Color Fiesta User`

---

## 3. Incident History & Resolution Log

### Incident #001: Messenger Chatbot Silent / No Replies (October 25, 2026)
- **Symptoms**:
  - Customers sent messages on Facebook Messenger (*"hello, do you have any new products in your stock?"*).
  - The Facebook Page sent an initial generic welcome message but failed to generate or send any AI follow-up response.
- **Root Cause Analysis**:
  1. Node `node-gemini-model-cure` was initially configured with `models/gemini-3.1-flash-lite`.
  2. Google Generative AI API `v1beta` returned `503 Service Unavailable: This model is currently experiencing high demand`.
  3. When an attempt was made to switch to `models/gemini-1.5-flash`, the API returned `404 Not Found` (deprecated/removed in Google's API model list for this endpoint in late 2026).
  4. LangChain execution threw an unhandled exception and halted the execution before reaching `Send Reply to Cure-Care User`.
- **Resolution**:
  1. Decrypted the n8n stored credentials for `SwjFEuheRHaOM5mk` using CryptoJS AES OpenSSL format and queried Google's live `ListModels` API endpoint.
  2. Identified active, high-throughput models: `models/gemini-2.5-flash` and `models/gemini-3.5-flash`.
  3. Benchmarked streaming generation latency: `models/gemini-2.5-flash` returned HTTP 200 within 250ms.
  4. Updated both `workflow_entity` and `workflow_history` in n8n's SQLite database to point both Cure-Care and Color Fiesta to `models/gemini-2.5-flash`.
  5. Added automatic retry resilience (`retryOnFail: true`, `maxTries: 3`, `waitBetweenTries: 1000`) on the LangChain agent nodes.
  6. Verified end-to-end execution with real customer PSID (`28765162506426793`). Execution #6523 succeeded in 3.5s and delivered the response directly into Facebook Messenger.

---

## 4. Web Application Features & Pipeline (Next.js)

### 4.1 Products & Inventory Management
- **Catalog Source**: SQLite (`database/curecare.db`) via `better-sqlite3` and RESTful Express APIs.
- **Stock Status**: Dynamic toggle between `In Stock` and `Out of Stock` based on quantity threshold and explicit availability flags.
- **Active / Deactivate Function**: Allows store administrators to toggle whether a product is displayed on the live public storefront without deleting catalog records.
- **Quick Edit vs. Edit Details Pipeline**:
  1. *Quick Edit*: In-line / Modal editing for immediate updates (Price, Stock Count, Stock Status, Active Status).
  2. *Edit Details*: Dedicated detailed editing modal & gallery manager for comprehensive updates:
     - Full Bengali & English descriptions, category re-assignment, SKU.
     - Dynamic product variations manager (weight, price, discount price, stock).
     - **Product Image Gallery (Min 5+ images)**: Multi-image file upload via `/api/admin/upload-multiple`, direct image URL linking, interactive thumbnail cards, one-click primary image assignment (`⭐ প্রধান বানান`), and deletion.
     - Automatic linking of initial placeholder images into each product's editable gallery (`additional_images`).
     - Live storefront dynamic gallery viewer in the Product Detail Modal with interactive clickable thumbnail switcher.
- **Image Upload Management**: Form-based image upload pipeline saving to `public/images/uploads/` and referencing live paths.

---

## 5. Maintenance & Diagnostic Cheatsheet

### Check n8n Executions on VPS
```bash
ssh root@2.25.75.30
python3 -c "
import sqlite3
conn = sqlite3.connect('/var/lib/docker/volumes/n8n_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute('SELECT id, workflowId, status, startedAt FROM execution_entity WHERE workflowId=\"m7pLnAyrevK5dHvv\" ORDER BY id DESC LIMIT 5')
for r in c.fetchall():
    print(r)
"
```

### Restart n8n Container
```bash
docker restart n8n_workflow_engine
```

### Test Messenger Webhook Endpoint
```bash
curl -i -X POST "https://saasflow.duckdns.org/webhook/facebook-messenger" \
  -H "Content-Type: application/json" \
  -d '{"object":"page","entry":[{"id":"311099052086184","messaging":[{"sender":{"id":"28765162506426793"},"recipient":{"id":"311099052086184"},"message":{"text":"test"}}]}]}'
```
