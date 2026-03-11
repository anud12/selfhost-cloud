# Task ID: implement-route-listing

Title: Add listing and view for project route definitions

Description:
- Provide a simple way (CLI/API/UI) to list, filter and inspect per-project route files and their active/inactive status, last-modified time and author.
- Suggested output format: host/path, short target summary, status, last modified, author, conflict flags.
- Store or index route metadata so listing is fast and searchable.

Success Criteria:
- Listing shows required fields for each route and supports filtering by status and host.
- Inspecting an entry shows a concise human-readable summary and history link.

Verification Steps:
1. Create several example route files with different statuses and confirm they appear in the listing with correct metadata.
2. Inspect a route and confirm the summary matches expected behavior.

Estimated Effort: 2-4 days
Owner: Backend + Frontend/CLI
Dependencies: implement-route-apply
