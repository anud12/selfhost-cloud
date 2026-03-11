# Task ID: create-e2e-tests-and-migration-checklist

Title: Create E2E test suite and per-project migration checklist

Description:
- Develop an automated E2E test suite that verifies add/edit/remove/migrate/rollback flows for sample projects. Place tests under tests/e2e/routing/.
- Produce an operator-facing per-project migration checklist at _project/migration-checklists/<project-name>-checklist.md that lists steps to migrate safely and required verification steps.

Success Criteria:
- E2E suite runs successfully in CI/staging and validates the core flows.
- Checklist exists and has concrete verification steps (preview, run tests, review report, apply, smoke-test, rollback plan).

Verification Steps:
1. Run the E2E suite against staging and confirm all routing scenarios pass.
2. Follow the checklist for a sample project and confirm migration can be completed and rolled back using the defined steps.

Estimated Effort: 3-5 days
Owner: QA / Platform operator
Dependencies: implement-route-apply, build-migration-tool-single-project, generate-migration-report
