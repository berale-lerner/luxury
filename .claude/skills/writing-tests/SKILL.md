---
name: writing-tests
description: The testing policy for this project — every task ships with tests, and certain changes have mandatory test categories that protect security boundaries. Use this skill whenever implementing a feature, fixing a bug, adding or changing an agent tool, touching a migration/GRANT/RLS policy, working on the messaging layer, or writing tests of any kind. Also use it when about to report a task as finished, to check nothing required was skipped. Use it even when the user did not mention tests — in this project a change without tests is not a finished change.
---

# Writing tests

[TESTING.md](../../../TESTING.md) is the authoritative document — read it before writing tests. This skill covers the part that is easy to get wrong: **deciding which tests a given change actually requires.**

The rule is simple and non-negotiable: a change without tests is not a finished change. Do not report a task as complete without them.

## Why some categories are mandatory

Most tests in this project protect against ordinary bugs. A few protect **security boundaries** that were deliberately designed and are documented in [CLAUDE.md](../../../CLAUDE.md).

The important property of those boundaries is that they fail *silently*. A tool that returns one field too many still works. A GRANT that exposes an extra column still works. Nothing errors, nothing is noticed — until a guest sees something they should not have. Tests are the only thing that turns a silent failure into a loud one, which is why the categories below are not optional.

## What your change requires

Work out what you touched, then write the tests listed for it. A change often lands in more than one row.

| If the change touches… | Mandatory tests |
|---|---|
| **An agent tool** (new or modified) | A test asserting the **exact set of fields** returned, plus validation tests for every parameter the model supplies |
| **A migration, role, GRANT, or RLS policy** | Permission tests — that the boundary holds *and* that the forbidden access actually fails |
| **The messaging / send layer** | That the recipient resolves from `conversation_id` and never from free-form input or model output |
| **Conversations or agent muting** | That a manager message mutes the agent in that conversation, and that it does not resume on its own |
| **A DB query or data access** | Integration test against real Postgres — not a mock |
| **Pure logic** (dates, availability, parsing, formatting) | Unit tests, including the boundaries and the empty case |

### Field-set assertions

For tools, assert the returned key set exactly rather than checking that expected fields are present. The failure this catches is a field appearing that nobody intended — from a schema change, a refactor, or an upstream API like Mini-Hotel adding something to its response. A test that only checks for expected fields passes happily while an unintended one leaks into the model's context.

### Permission tests assert failure

The valuable assertion is the negative one. `bot_user` reading from `business` must **raise**. Guest A requesting guest B's rows must come back **empty**. A test that only confirms allowed access works would still pass if every restriction were dropped.

## Rules that apply to every test

- **Real Postgres, built from the migrations.** Not a mock, not a shared dev database. If the schema in the test is not the one the migrations produce, the test is verifying a database that does not exist.
- **No real external APIs.** Mini-Hotel and Telegram are mocked at the HTTP boundary — that way the parsing and validation of their responses are tested too. Keep real response samples as fixtures, including errors and partial responses.
- **No dependence on the clock or on test order.** Inject time as a dependency. Anything computing "X days before" cannot be tested against a clock you do not control.
- **Each test starts from a known state** — transaction rollback or truncate, never leftovers from a previous test.

## Test behavior, not implementation

A test that breaks on every refactor is a liability, not protection. Assert what the code produces, not how it gets there. Skip getters, framework code, and rendering without logic.

## Before reporting a task finished

- Tests exist for the new code
- Every model-supplied parameter has a validation test
- Any new or changed tool has a field-set assertion
- Anything touching GRANT / RLS / migrations has permission tests
- No real external API is called
- The DB under test was built from migrations only
- No dependence on wall-clock time or test ordering

If a category applies and you did not write the test, say so explicitly rather than reporting the task as done.
