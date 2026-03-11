# Task ID: build-migration-tool-single-project

Title: Build migration tool to extract central routes into project files

Description:
- Create a migration tool (CLI) that, for a given project identifier, finds central routing entries that map to that project and generates equivalent per-project route files in _project/migrations/<project-name>/ or suggests the target project folder (e.g., apps/<project-name>/routes/).
- The tool must produce a dry-run mode and a preview mode that shows expected results without applying them.

Success Criteria:
- Migration tool produces route files and a migration summary in dry-run and run modes.
- Dry-run demonstrates no live changes and lists differences when enabled.

Verification Steps:
1. Run dry-run and confirm migration listing with proposed files and summaries.
2. Run full migration against a staging project and execute E2E tests to confirm behavior parity.

Estimated Effort: 3-5 days
Owner: Platform operator / Backend engineer
Dependencies: implement-route-apply, implement-conflict-detection
