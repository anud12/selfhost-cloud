# Task ID: generate-migration-report

Title: Implement human-readable migration report generation

Description:
- Generate a report for each migration containing: source central route, target project file, any detected behavioral differences, and recommended actions.
- Store reports under _project/migrations/reports/<project-name>-YYYYMMDD.md
- Include short examples of request/response where differences exist.

Success Criteria:
- For a sample migration, a report is generated containing all required sections and is human-reviewable.

Verification Steps:
1. Run migration in dry-run and confirm a report file is created with mapping and difference sections.
2. Review the report and confirm it includes example request/response snippets for any differences.

Estimated Effort: 1-2 days
Owner: Platform operator / Backend engineer
Dependencies: build-migration-tool-single-project
