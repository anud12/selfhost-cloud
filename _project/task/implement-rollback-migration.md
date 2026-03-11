# Task ID: implement-rollback-migration

Title: Implement rollback mechanism for migrations

Description:
- Implement a rollback action that can revert an applied migration: deactivating project route files, restoring central routes to previous state or reapplying previous configuration.
- Log rollback events with author and reason under _project/migrations/audit/
- Provide a safe dry-run for rollback to verify expected state after rollback.

Success Criteria:
- Rollback restores observable routing for test requests to pre-migration behavior and records the rollback event with author and reason.

Verification Steps:
1. Apply a migration in staging and confirm behavior change with E2E tests.
2. Run rollback and confirm E2E tests validate restoration of pre-migration responses.
3. Confirm rollback event is recorded in the audit folder.

Estimated Effort: 2-4 days
Owner: Platform operator / Backend engineer
Dependencies: build-migration-tool-single-project, generate-migration-report
