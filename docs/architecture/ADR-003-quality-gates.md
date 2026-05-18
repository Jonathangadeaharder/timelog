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
| Required Checks | Aggregate | Fail if any job failed |

### Merge Gate (`merge-gate.yml`)

Runs on push to `main`/`master`. Includes all PR gate jobs plus:

| Job | Tool | Purpose |
|-----|------|---------|
| CodeQL | `github/codeql-action` | Semantic code analysis |
| Mutation Testing | `mutmut run` | Verify test suite kills mutants |
| SonarCloud | `sonarsource/sonarcloud-github-action` | Code quality dashboard |

### Runner Strategy

- Lint/typecheck/test/security scans: **ubuntu-latest** (GitHub-hosted)
- SonarCloud: **self-hosted** (macOS runner)
- PR-Agent: **self-hosted** (LM Studio at localhost:1234)

### PR-Agent

- Slash-command-only (`/review`, `/describe`, `/improve`)
- Disabled by default via `ENABLE_PR_AGENT` repo variable
- Model: `openai/qwen3.6-27b-mlx` via local LM Studio
- Config in `.pr_agent.toml`

### SonarCloud

- Project key: `Jonathangadeaharder_timelog`
- Organization: `jonathangadeaharder`
- Coverage XML imported from `coverage.xml`
- Config in `sonar-project.properties`

## Consequences

- PRs blocked until all quality gates pass
- Mutation testing adds ~2-3 min per merge gate run
- SonarCloud requires self-hosted runner with network access
- PR-Agent only activates on manual `/review` commands (not automatic)
