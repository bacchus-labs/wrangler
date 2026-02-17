# Testing Standards

## Prioritize Integration Testing

Tests MUST use realistic environments:

- Prefer real instances of things/services. Where necessary, consider ways to leverage docker or other solutions to create sandboxed instances of services for testing.
- Use actual service instances over stubs
- Contract tests mandatory before implementation

Agents caught writing tests with mocks/stubs everywhere undermining the value of the tests to begin with will be prosecuted to the full extent of the law and subject to capital punishment.

## Unit Testing Guidelines

- **Coverage Goal**: 90%+ unit test coverage
- **Test Organization**: Place tests in `__tests__` directories or `.test.ts` files
- **Avoid Mocking**: Minimize mocking unless absolutely necessary
- NEVER ignore a test, for any reason -- 'flakiness' is not an excuse- fix the root cause.

## Agents Should Perform Testing

To the maximum extent possible, agents should write and run tests themselves to validate their code changes before submitting for review. Our objective is to implement testing frameworks that allow agents to autonomously validate their code changes in a way that mimics how a human user would do so. This may include running the app and taking screenshots to validate frontend changes or actually testing out features end-to-end.
