# Task ID: implement-route-apply

Title: Implement applying per-project route files to the gateway

Description:
- Implement the mechanism that reads validated per-project route files and applies them to the routing layer so traffic is routed as specified.
- Provide clear activation states (active/queued/inactive) and reconcile with existing central routes.
- Add integration tests (end-to-end) that demonstrate requests to the host/path return the intended target.
Suggested locations: infrastructure/route-manager, integration tests under tests/e2e/routing/

Success Criteria:
- Applying a validated route makes it active and verified by E2E tests that exercise the actual routing behavior.
- Activation records show author/timestamp and an activation id.

Verification Steps:
1. Apply a validated example route and run E2E test: send a request to the defined host/path and confirm it hits the expected target.
2. Verify activation metadata is recorded and visible via the route listing.

Estimated Effort: 3-5 days
Owner: Backend / Platform engineer
Dependencies: implement-route-validation, define-route-file-spec
