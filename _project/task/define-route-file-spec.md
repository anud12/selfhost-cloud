# Task ID: define-route-file-spec

Title: Define route file specification and examples

Description:
- Create a concise, human-readable specification describing required and optional route fields, examples and edge-cases. Include example files for common cases (host/path -> service, path rewrite, redirects, health-check routes).
- Place the spec at: _project/specs/route-file-spec.md and examples at: _project/examples/routes/<project-name>-example.yaml
- Provide a short glossary explaining terms used by maintainers and operators.

Success Criteria:
- _project/specs/route-file-spec.md exists and documents required fields, semantics and at least 4 example route files covering normal, wildcard, redirect and deprecated behaviors.
- Examples are validated by the validation team (manual review) for clarity.

Verification Steps:
1. Open the spec and verify it documents: host, path match, upstream/target, status (active/inactive), metadata (author, timestamp) and a short example for each case.
2. Open each example and confirm it is readable and maps to the described behavior.

Estimated Effort: 1-2 days
Owner: Product / Docs
Dependencies: none
