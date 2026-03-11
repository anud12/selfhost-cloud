# Task ID: implement-route-validation

Title: Implement route validation logic and tests

Description:
- Implement server-side validation that rejects or warns on invalid route files (missing required fields, ambiguous or unreachable target, invalid host/path syntax).
- Provide clear, human-readable messages that reference lines in the route file.
- Add unit tests and error message tests under the repository's test framework (suggest tests/route-validator/).

Success Criteria:
- Validation logic covers required fields and simple semantics and reports human-readable errors.
- Unit tests cover valid and invalid examples and pass locally.

Verification Steps:
1. Run unit tests for the validator; all tests pass.
2. Feed intentionally malformed example route files and confirm the validator returns expected human-readable errors with line references.

Estimated Effort: 2-3 days
Owner: Backend / Platform engineer
Dependencies: define-route-file-spec
