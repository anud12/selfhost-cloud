# Task ID: integrate-validation-into-save-workflow

Title: Integrate validation into the save/commit workflow

Description:
- Ensure route files are validated when saved or submitted (e.g., via UI save, commit hook or CI job).
- Provide immediate feedback to the author indicating success or specific errors/warnings.
- If a UI exists, show validation results inline; if edits are made via Git, surface validation results in CI logs and developer notifications.

Success Criteria:
- Saving a valid route shows a success confirmation and timestamp.
- Saving an invalid route prevents activation and surfaces errors to the author.

Verification Steps:
1. Save a known-valid example and confirm success confirmation is shown and timestamped.
2. Save a known-invalid example and confirm the save is rejected or marked invalid and errors are visible to the author in the same workflow.

Estimated Effort: 2-4 days
Owner: Backend/CI & Frontend (if UI exists)
Dependencies: implement-route-validation
