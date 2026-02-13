# Nexus ERP: API Technical Registry

## 🔑 Authentication
All requests (except `/health`) require a valid session via **HttpOnly Cookies** (Supabase JWT).

## 🫀 System Health
### `GET /health`
Returns the status of the server, uptime, and resource usage.
- **Auth Required**: No
- **Response**: `200 OK`

## 💰 Finance & Lending
### `POST /api/lending/loan-applications`
Submit a new loan application.
### `GET /api/lending/loans`
Fetch loans for the current organization.

## 🛒 Sales & POS
### `POST /api/sales/transactions`
Process a new sale and update inventory.

## 👥 CRM
### `GET /api/crm/customers`
List all customers with AI-driven risk scores.

## 🧠 AI / Natural Language
### `POST /api/nl-query`
Execute natural language queries against the database.
### `POST /api/ai/risk-assessment/:id`
Trigger an AI-driven credit risk assessment for a specific entity.

## 🛡️ Audit Logs
### `GET /api/audit-logs`
Retrieve system event logs (Admin only).
