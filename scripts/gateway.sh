#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Arzi-bol Gateway Quality & Security Gate ==="

fail() {
  echo "[FAIL] $1" >&2
  exit 1
}

pass() {
  echo "[PASS] $1"
}

info() {
  echo "[INFO] $1"
}

# 1. Git conflict marker & whitespace check
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git grep -nE '^(<{7}|={7}|>{7})( |$)' -- ':!scripts/gateway.sh' ':!scripts/gateway.ps1' >/dev/null 2>&1; then
    git grep -nE '^(<{7}|={7}|>{7})( |$)' -- ':!scripts/gateway.sh' ':!scripts/gateway.ps1'
    fail "Git merge conflict markers detected."
  fi
  pass "No git conflict markers"

  # 2. Check no .env or key files are tracked
  TRACKED_SECRETS=$(git ls-files | grep -E '(^\.env($|\.)|\.pem$|\.key$|\.p12$|\.pfx$|credentials\.json$|service-account.*\.json$)' | grep -vE '^\.env\.example$' || true)
  if [ -n "$TRACKED_SECRETS" ]; then
    echo "$TRACKED_SECRETS"
    fail "Sensitive files are tracked by git."
  fi
  pass "No sensitive files tracked by git"

  # 3. Secret pattern scan across tracked files
  SECRET_REGEX='(-----BEGIN ([A-Z ]+)?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35})'
  if git grep -nE "$SECRET_REGEX" -- ':!scripts/gateway.sh' ':!scripts/gateway.ps1' >/dev/null 2>&1; then
    git grep -nE "$SECRET_REGEX" -- ':!scripts/gateway.sh' ':!scripts/gateway.ps1'
    fail "Potential hardcoded secret or API key detected."
  fi
  pass "Secret pattern scan clean"
else
  info "Not a git repository; skipping git checks."
fi

# 4. Node.js / Frontend / TypeScript checks (when package.json exists)
if [ -f "package.json" ]; then
  command -v node >/dev/null 2>&1 || fail "Node.js is required when package.json is present."
  command -v npm >/dev/null 2>&1 || fail "npm is required when package.json is present."

  has_script() {
    node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$1'] ? 0 : 1)"
  }

  if has_script lint; then
    info "Running npm run lint..."
    npm run lint
    pass "Lint passed"
  fi

  if has_script typecheck; then
    info "Running npm run typecheck..."
    npm run typecheck
    pass "Typecheck passed"
  elif [ -f "tsconfig.json" ]; then
    info "Running npx tsc --noEmit..."
    npx tsc --noEmit
    pass "TypeScript check passed"
  fi

  if has_script test; then
    info "Running npm test..."
    npm test
    pass "Tests passed"
  fi

  if has_script build; then
    info "Running npm run build..."
    npm run build
    pass "Build passed"
  fi

  if [ -f "package-lock.json" ]; then
    info "Running npm audit --audit-level=high..."
    npm audit --audit-level=high
    pass "Dependency security audit passed"
  fi
else
  info "No package.json yet; skipping Node.js checks."
fi

# 5. Python checks (when pyproject.toml or requirements.txt exists)
if [ -f "pyproject.toml" ] || [ -f "requirements.txt" ]; then
  if command -v ruff >/dev/null 2>&1; then
    info "Running ruff check..."
    ruff check .
    pass "Ruff lint passed"
  fi
  if command -v pytest >/dev/null 2>&1; then
    info "Running pytest..."
    pytest
    pass "Pytest passed"
  fi
else
  info "No Python project files yet; skipping Python checks."
fi

# 6. Docker validation (when Dockerfile exists)
if [ -f "Dockerfile" ]; then
  if command -v docker >/dev/null 2>&1; then
    info "Validating Dockerfile build..."
    docker build --check . 2>/dev/null || docker build -t arzi-bol-gateway-check .
    pass "Docker validation passed"
  else
    info "Docker CLI not installed; skipping Docker check."
  fi
fi

# 7. GitHub CLI check (local interactive environments)
if [ "${GITHUB_ACTIONS:-false}" != "true" ] && command -v gh >/dev/null 2>&1; then
  gh auth status >/dev/null 2>&1 || fail "GitHub CLI (gh) is not authenticated."
  pass "GitHub CLI authenticated"
fi

echo "=== Gateway PASSED: All checks clean ==="
