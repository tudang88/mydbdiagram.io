#!/usr/bin/env bash
# Run all unit tests that do not require a running server (no localhost API).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TESTS=(
  src/client/core/__tests__/test-auto-layout.ts
  src/client/core/__tests__/test-domain-models.ts
  src/client/core/__tests__/test-validators.ts
  src/server/__tests__/test-repositories.ts
  src/server/__tests__/test-services.ts
  src/server/__tests__/test-exporters.ts
  src/server/__tests__/test-controllers.ts
  src/client/__tests__/test-state-management.ts
  src/client/__tests__/test-parsers.ts
  src/client/__tests__/test-export-functionality.ts
  src/client/__tests__/test-api-client.ts
  src/client/__tests__/test-ui-components.ts
  src/client/__tests__/test-toolbar.ts
  src/client/__tests__/test-editor-components.ts
  src/client/__tests__/test-import-functionality.ts
  src/client/__tests__/test-save-load-functionality.ts
  src/client/__tests__/test-canvas-interactions.ts
  src/client/__tests__/test-ui-integration.ts
  src/client/__tests__/test-frontend-services-comprehensive.ts
)

for t in "${TESTS[@]}"; do
  echo ""
  echo "==> $t"
  npx tsx "$t"
done

echo ""
echo "✅ All unit tests passed (${#TESTS[@]} files)."
