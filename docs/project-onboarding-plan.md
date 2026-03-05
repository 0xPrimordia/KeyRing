# Project Onboarding Plan

Notes on how projects and threshold lists are associated, and what's needed for a complete project onboarding flow.

## Current State

### Projects

- **HCS topic**: Projects are discovered from the project registry topic (HCS-2). Messages with `op: "register"` and `t_id` matching the operator account ID are treated as that operator's projects.
- **Database**: `keyring_projects` stores project metadata (company_name, legal_entity_name, public_record_url, owners, topic_message_id).
- **Gap**: HCS project registrations are not automatically written to the DB. The DB is populated separately (e.g. `send-test-project.ts` or manual inserts). There is no project onboarding flow yet.

### Threshold Lists

- **Database**: `keyring_threshold_lists` links to projects via `project_id` (FK to `keyring_projects.id`).
- **On creation**: When creating a threshold list from the project dashboard form, `projectId` is passed and stored in `project_id`. If no project (standalone), `project_id` is null.
- **Schema**: `threshold_account_id`, `hcs_topic_id`, `status`. Threshold and key counts are on-chain (Mirror Node).

### Association Flow

1. **Operator projects API** (`/api/operator/projects?accountId=0.0.xxx`):
   - Fetches HCS messages where `t_id` = operator account ID.
   - Fetches all DB projects with their threshold lists.
   - Matches HCS projects to DB projects by `company_name` + `legal_entity_name`.
   - For each HCS project, attaches threshold lists from the matched DB project (if any).
   - Adds env-configured list (`THRESHOLD_LIST_ACCOUNT_TESTNET`) to first project or synthetic "Operator" project (no DB link).

2. **Name matching**: HCS project ↔ DB project linkage is by exact string match on company and legal entity name. No `t_id` or account ID is stored on `keyring_projects`.

### Summary Table

| Source | Association |
|--------|-------------|
| HCS topic | Projects by `t_id` = operator account ID |
| DB | Lists → projects via `keyring_threshold_lists.project_id` |
| Matching | HCS project ↔ DB project by `company_name` + `legal_entity_name` |
| Env config list | Attached to first project in memory only (no DB link) |

## Gaps for Project Onboarding

1. **No HCS → DB sync**: When a project is registered on the HCS topic, it is not automatically created in `keyring_projects`. Need a sync step or onboarding flow that creates/updates DB records from HCS messages.

2. **No operator/account link on projects**: `keyring_projects` has no `operator_account_id` or `t_id`. Operator ownership is inferred only from HCS messages. Consider adding `operator_account_id` to `keyring_projects` for clearer ownership.

3. **Standalone lists**: Threshold lists created with `project_id: null` (standalone) do not appear under any project in the dashboard unless they match the env-configured list. Consider an "Unassigned lists" or "Standalone" section for operator-created lists without a project.

4. **Env-configured list**: `THRESHOLD_LIST_ACCOUNT_TESTNET` is injected into the UI but not in the DB. If it should be persistent, it needs to be seeded or registered.

## Future Onboarding Flow (Proposed)

1. **Register project on HCS** (existing): Operator submits project to project registry topic.
2. **Sync to DB**: On registration or periodic sync, create/update `keyring_projects` from HCS message, with `topic_message_id` and optionally `operator_account_id` = `t_id`.
3. **Create threshold lists**: Operator creates lists from dashboard, selecting project (or standalone). `project_id` links list to project.
4. **Optional**: Add `operator_account_id` to `keyring_projects` for filtering and ownership checks.
