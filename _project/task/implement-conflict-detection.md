# Task ID: implement-conflict-detection

Title: Implement conflict detection and precedence messaging

Description:
- Implement detection for overlapping/contradictory route definitions across central config and project files.
- Define and document the precedence rules in _project/specs/conflict-precedence.md.
- When conflicts are detected during creation/edit, surface a clear warning describing the overlap and expected outcome.

Success Criteria:
- Conflict detection identifies overlaps and provides a deterministic outcome that can be demonstrated by a test request.
- Conflict messages include enough context for maintainers to decide next steps.

Verification Steps:
1. Create overlapping route definitions and confirm conflict warning appears with explanation.
2. Run a test request for the overlapping host/path and confirm routing follows the documented precedence rule.

Estimated Effort: 2-4 days
Owner: Backend / Platform engineer
Dependencies: define-route-file-spec, implement-route-apply
