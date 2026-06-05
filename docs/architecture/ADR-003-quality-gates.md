---
id: ADR-003
kind: adr
title: Quality Gates
status: draft
date: 2026-05-17T00:00:00.000Z
authors: []
reviewers: []
tags: []
supersedes: []
superseded_by: []
depends_on: []
blocks: []
implements: []
related: []
external: []
project: timelog
checksum: 5961d5927d1771636b9e645bc60b356a03d9396c6ed70fd8337ab1a47365d782
---

## Context

Need automated CI/CD quality gates to maintain code quality, security, and test coverage on every PR and merge.

## Decision

### PR Gate (`pr-gate.yml`)

Runs on every pull request. Jobs:

| Job | Tool | Purpose |
|-----|------|---------|
| Repo Hygiene | Custom script | Check for iCloud sync conflict files |
| Python Quality | `ruff` + `pyright` + `pytest --cov-branch --cov-fail-under=90` | Lint, typecheck, test + coverage gate |
| Dependency Scan | Trivy (filesystem) | Find HIGH/CRITICAL vulnerabilities |
| Secret Scanning | gitleaks | Detect leaked secrets |
| Repository Structure | structurelint | Enforce project structure conventions |
| Test Quality | pytest-linter | Lint test files for anti-patterns |
| Required Checks | Aggregate | Fail if any job failed |

### Merge Gate (`merge-gate.yml`)

Runs on push to `main`/`master`. Includes all PR gate jobs plus:

| Job | Tool | Purpose |
|-----|------|---------|
| CodeQL | `github/codeql-action` | Semantic code analysis |
| SonarCloud | `sonarsource/sonarcloud-github-action` | Code quality dashboard |

> **Note:** Mutation testing (`mutmut`) is configured in `pyproject.toml` but not yet integrated into the merge gate workflow.

### Runner Strategy

- All jobs: **self-hosted macOS runners** (labels: `self-hosted`, `macOS`, `security`/`python`)
- SonarCloud: same self-hosted runner (installs `sonar-scanner` via Homebrew)
- PR-Agent: self-hosted runner (label: `arm64`, `VidiomTM`)

### PR-Agent

- Slash-command-only (`/review`, `/describe`, `/improve`, `/ask`)
- Disabled by default via `ENABLE_PR_AGENT` repo variable
- Model: `openai/glm-5.1` via CrofAI API (`https://crof.ai/v1`)
- Config in `.pr_agent.toml`

### SonarCloud

- Project key: `Jonathangadeaharder_timelog`
- Organization: `jonathangadeaharder`
- Coverage XML imported from `coverage.xml`
- Config in `sonar-project.properties`

## Consequences

- PRs blocked until all quality gates pass
- SonarCloud requires self-hosted runner with network access
- PR-Agent only activates on manual `/review` commands (not automatic)
