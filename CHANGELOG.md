## [Unreleased]
- Changed default timezone from "Central European Standard Time" to "Pacific Standard Time" (PST)
# Changelog for outlook-mcp (Fork)

## [Unreleased]
- Forked from upstream project (ryaker/outlook-mcp)
- Invalidated all upstream certifications and badges (see README fork notice)
- Added explicit user consent for all sensitive actions (send, create, delete, move, rule create)
- Introduced SECURE_PROMPT_MODE (enabled by default) for confirmation of sensitive actions
- Made OAuth scopes configurable via OUTLOOK_SCOPES environment variable, with validation and secure defaults
- Fail-closed: server and sensitive actions refuse to run if required config is missing
- Input sanitization and suspicious pattern checks for all sensitive actions to mitigate prompt injection
- Logging of all sensitive actions and arguments, with alerting on repeated suspicious or abusive attempts
- Documented all security changes and fork status in README

## [Upstream]
- See upstream changelog and commit history for original features and fixes
