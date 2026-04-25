# Wiki Management System Changelog

## [2.1.0] - 2026-04-25
### Added
- **Conceptual Script Naming**: Mapped raw Python paths to intuitive LLM Wiki philosophy names (e.g., Cognitive Ingestor, Wiki Sanitizer).
- **Unit Testing**: Introduced `pytest` and `httpx` for backend API reliability.
- **API Documentation**: Documented all currently active backend endpoints.

---

## Backend API Documentation

### Global Settings
- **Base URL**: `http://localhost:8000`
- **Auth**: HTTP Basic Authentication (`WEB_USERNAME`, `WEB_PASSWORD` in `.env`)

### `routers/config.py` (Global Settings)
- `GET /api/config/settings`
  - **Returns**: Key-value map of global settings (e.g., `MY_API_KEY`, `MODEL_NAME`).
- `POST /api/config/settings`
  - **Body**: `{"settings": [{"key": "...", "value": "..."}]}`
  - **Description**: Updates the SQLite settings table dynamically.

### `routers/wiki.py` (Dashboard & Health)
- `GET /api/wiki/health`
  - **Returns**: `WikiStats` (total_notes, concept_count, tags map, recent_notes, latest_executions, success_rate)
  - **Description**: Gathers comprehensive stats by parsing the `Digital Brain Wiki` files and querying the execution database.

### `routers/scripts.py` (Script Execution & Cron)
- `GET /api/scripts/discover`
  - **Returns**: List of script objects `[{"path": "...", "name": "...", "description": "..."}]`
  - **Description**: Dynamically scans the wiki directory for `.py` files and maps them to conceptual names.
- `POST /api/scripts/run`
  - **Body**: `{"command": "..."}`
  - **Returns**: Command output (stdout, stderr, exit code).
  - **Description**: Runs a gemini or python command, logs execution to SQLite.
- `GET /api/scripts/cron`
  - **Returns**: List of configured cron jobs.
- `POST /api/scripts/cron`
  - **Body**: `{"command": "...", "cron_expression": "..."}`
  - **Description**: Schedules a new background job via APScheduler.
- `DELETE /api/scripts/cron/{job_id}`
  - **Description**: Deletes a scheduled job.

### `routers/git.py` (Version Control)
- `GET /api/git/status`
  - **Returns**: Output of `git status`.
- `GET /api/git/log`
  - **Returns**: Structured JSON history of the last 20 commits.
- `POST /api/git/commit`
  - **Query Param**: `message`
  - **Description**: Commits all current changes (`git add . && git commit -m ...`).
- `POST /api/git/restore`
  - **Query Param**: `filepath`
  - **Description**: Discards unstaged changes in a specific file.
- `POST /api/git/revert`
  - **Query Param**: `commit_hash`
  - **Description**: Hard resets the wiki to the specified commit.

### `routers/livesync.py` (Plugin Monitoring)
- `GET /api/livesync/status`
  - **Returns**: `LiveSyncStatus` (configured, write_log_enabled, log_content)
  - **Description**: Reads LiveSync `data.json` and parses `livesync.log`.
- `POST /api/livesync/toggle-log`
  - **Query Param**: `enable` (boolean)
  - **Description**: Modifies LiveSync `data.json` to enable/disable local logging.
