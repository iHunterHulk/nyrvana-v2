# Contributing to Nyrvana V2

This document explains the workflow for making changes to the Nyrvana V2 repository.

## Branch Naming

All changes should be made in feature branches with the following naming convention:
`sprint-X-feature-name` where X is the sprint number.

For example: `sprint-3-pr-1-repo-skeleton`

## Workflow Principles

1. **Never push to main directly** - All changes must go through a pull request.
2. **One logical change per PR** - Keep pull requests focused on a single, coherent change.
3. **Never commit secrets** - Files containing secrets (`.env`, `*.key`, `*.pem`) are gitignored and should never be committed.
4. **Squash-only merge policy** - All pull requests are merged using squash merge
5. **No em dashes rule** - Never use em dashes (—) anywhere in code, documentation, commit messages, or PR descriptions
6. **Tests are mandatory** - Each feature must include comprehensive tests

## Pull Request Process

1. Create a feature branch following the naming convention above.
2. Make your changes in the branch.
3. Commit your changes with a clear, descriptive message.
4. Push the branch to the repository.
5. Open a pull request from your branch to the `main` branch.
6. Wait for review and merge approval.

## Secret Management

All secret files are gitignored and will not be included in the repository:
- `.env` files
- `*.key` files
- `*.pem` files
- Any file containing passwords or API keys

If you need to reference configuration values that would normally be in a secret file, use environment variable placeholders or documentation files that describe the required variables without including actual values.

## Testing Requirements

Every contribution must include:
1. Unit tests for new functionality
2. Integration tests where applicable
3. Test coverage of at least 80%
4. All existing tests must continue to pass

## Merge Policy

All changes to the repository must be made through pull requests. Direct pushes to the main branch are strictly prohibited. All pull requests must be merged using squash merge to maintain a clean, linear history.