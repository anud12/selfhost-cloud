# Migration checklist for example

1. Preview candidate route(s):
   - Run: node infrastructure/route-manager/preview.js <candidate.yaml> --host <host> --path <path>
   - Verify simulated response and diffs vs live.
2. Run migration in dry-run:
   - node infrastructure/route-manager/migrate.js example --dry-run
   - Confirm files that would be created and review mapping.
3. Generate migration report:
   - node infrastructure/route-manager/generate-report.js example
   - Review report under _project/migrations/reports/
4. Apply changes (staging):
   - node infrastructure/route-manager/apply.js activate <candidate.yaml> --author <operator>
   - Run E2E/smoke tests.
5. If issues found, run rollback:
   - node infrastructure/route-manager/rollback.js <activationId> --author <operator> --reason "rollout issue" --dry-run
   - If dry-run is acceptable, run without --dry-run to perform rollback.
6. Finalize:
   - Update project route files and documentation.
   - Close migration report and record audit notes.
