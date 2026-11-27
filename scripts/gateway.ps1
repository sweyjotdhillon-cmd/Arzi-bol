$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RootDir

function Fail($Message) {
    Write-Error "[FAIL] $Message"
    exit 1
}

function Pass($Message) {
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Info($Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

try {
    Write-Host "=== Arzi-bol Gateway Quality & Security Gate ===" -ForegroundColor Yellow

    # 1. Git checks
    $inGit = $false
    try {
        git rev-parse --is-inside-work-tree *> $null
        if ($LASTEXITCODE -eq 0) { $inGit = $true }
    } catch {}

    if ($inGit) {
        $conflictMatches = git grep -nE '^(<{7}|={7}|>{7})( |$)' -- ':!scripts/gateway.sh' ':!scripts/gateway.ps1' 2>$null
        if ($LASTEXITCODE -eq 0 -and $conflictMatches) {
            Write-Host $conflictMatches
            Fail "Git merge conflict markers detected."
        }
        Pass "No git conflict markers"

        $tracked = git ls-files
        $sensitive = $tracked | Where-Object {
            $_ -match '(^\.env($|\.)|\.pem$|\.key$|\.p12$|\.pfx$|credentials\.json$|service-account.*\.json$)' -and
            $_ -notmatch '^\.env\.example$'
        }
        if ($sensitive) {
            $sensitive | ForEach-Object { Write-Host $_ }
            Fail "Sensitive files are tracked by git."
        }
        Pass "No sensitive files tracked by git"

        $secretRegex = '(-----BEGIN ([A-Z ]+)?PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35})'
        $secretMatches = git grep -nE $secretRegex -- ':!scripts/gateway.sh' ':!scripts/gateway.ps1' 2>$null
        if ($LASTEXITCODE -eq 0 -and $secretMatches) {
            Write-Host $secretMatches
            Fail "Potential hardcoded secret or API key detected."
        }
        Pass "Secret pattern scan clean"
    } else {
        Info "Not a git repository; skipping git checks."
    }

    # 2. Node.js checks
    if (Test-Path "package.json") {
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js is required when package.json is present." }
        if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail "npm is required when package.json is present." }

        $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
        $scripts = $pkg.scripts

        if ($scripts -and $scripts.PSObject.Properties["lint"]) {
            Info "Running npm run lint..."
            npm run lint
            if ($LASTEXITCODE -ne 0) { Fail "Lint failed." }
            Pass "Lint passed"
        }

        if ($scripts -and $scripts.PSObject.Properties["typecheck"]) {
            Info "Running npm run typecheck..."
            npm run typecheck
            if ($LASTEXITCODE -ne 0) { Fail "Typecheck failed." }
            Pass "Typecheck passed"
        } elseif (Test-Path "tsconfig.json") {
            Info "Running npx tsc --noEmit..."
            npx tsc --noEmit
            if ($LASTEXITCODE -ne 0) { Fail "TypeScript check failed." }
            Pass "TypeScript check passed"
        }

        if ($scripts -and $scripts.PSObject.Properties["test"]) {
            Info "Running npm test..."
            npm test
            if ($LASTEXITCODE -ne 0) { Fail "Tests failed." }
            Pass "Tests passed"
        }

        if ($scripts -and $scripts.PSObject.Properties["build"]) {
            Info "Running npm run build..."
            npm run build
            if ($LASTEXITCODE -ne 0) { Fail "Build failed." }
            Pass "Build passed"
        }

        if (Test-Path "package-lock.json") {
            Info "Running npm audit --audit-level=high..."
            npm audit --audit-level=high
            if ($LASTEXITCODE -ne 0) { Fail "Dependency security audit failed." }
            Pass "Dependency security audit passed"
        }
    } else {
        Info "No package.json yet; skipping Node.js checks."
    }

    # 3. Python checks
    if ((Test-Path "pyproject.toml") -or (Test-Path "requirements.txt")) {
        if (Get-Command ruff -ErrorAction SilentlyContinue) {
            Info "Running ruff check..."
            ruff check .
            if ($LASTEXITCODE -ne 0) { Fail "Ruff lint failed." }
            Pass "Ruff lint passed"
        }
        if (Get-Command pytest -ErrorAction SilentlyContinue) {
            Info "Running pytest..."
            pytest
            if ($LASTEXITCODE -ne 0) { Fail "Pytest failed." }
            Pass "Pytest passed"
        }
    } else {
        Info "No Python project files yet; skipping Python checks."
    }

    # 4. Docker validation
    if (Test-Path "Dockerfile") {
        if (Get-Command docker -ErrorAction SilentlyContinue) {
            Info "Validating Dockerfile build..."
            docker build -t arzi-bol-gateway-check .
            if ($LASTEXITCODE -ne 0) { Fail "Docker validation failed." }
            Pass "Docker validation passed"
        } else {
            Info "Docker CLI not installed; skipping Docker check."
        }
    }

    # 5. GitHub CLI check
    if ($env:GITHUB_ACTIONS -ne "true" -and (Get-Command gh -ErrorAction SilentlyContinue)) {
        gh auth status *> $null
        if ($LASTEXITCODE -ne 0) { Fail "GitHub CLI (gh) is not authenticated." }
        Pass "GitHub CLI authenticated"
    }

    Write-Host "=== Gateway PASSED: All checks clean ===" -ForegroundColor Green
} finally {
    Pop-Location
}
