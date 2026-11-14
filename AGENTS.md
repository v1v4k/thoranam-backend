
# Thoranam Backend - Agent Instructions

## 1. Project Context

Thoranam is a private, multi-event Telugu wedding
management platform.

Backend stack:
- TypeScript + NestJS
- Modular monolith architecture
- PostgreSQL + Drizzle ORM
- Zod validation
- PostgreSQL-backed opaque sessions
- Docker + AWS App Runner
- S3, SQS, Lambda and CloudFront for media
- Resend for transactional email

Prefer simple, maintainable solutions that follow
the approved architecture.

## 2. Sources of Truth

Approved specifications are located in `../docs/`:

- PRD — product requirements and business rules
- System Design — architecture and security
- Database Design — schema and constraints
- API Contract — endpoints and request/response behavior

Before implementing a feature:
- Read the relevant specification sections.
- Inspect existing code and conventions.
- Identify dependencies and potential conflicts.
- Report missing or inaccessible documents.

Never invent business rules or silently change
approved specifications.

## 3. Scope and Boundaries

Primary write scope: this backend repository.

Allowed:
- Backend source code and tests
- Database migrations
- Backend configuration
- Docker and CI/CD configuration

Require approval before:
- Modifying frontend code or shared specifications
- Changing API contracts or architecture
- Introducing major dependencies or infrastructure
- Running destructive database or Git operations
- Deploying or modifying cloud resources
- Committing or pushing changes

Never expose credentials or bypass authorization.

## 4. Engineering Responsibilities

You are one coding agent capable of performing
different engineering responsibilities:

- Planner: Analyze requirements, dependencies and scope.
- Architect: Evaluate design and technical trade-offs.
- Developer: Implement maintainable NestJS code.
- Tester: Write and execute relevant tests.
- Reviewer: Check correctness, security and quality.
- DevOps: Prepare Docker, CI/CD and deployment changes.

These are responsibilities, not separate agents.

Use the appropriate responsibilities for each task.


## 5. Shared Workflow and Context

Before starting work, read:
- `../docs/ENGINEERING_GUIDELINES.md`
- `../docs/PROJECT_CONTEXT.md`

Follow the shared engineering workflow:
PLAN → BUILD → TEST → REVIEW → HANDOFF

The shared guidelines define:
- Development and verification procedures
- Code review expectations
- Cross-repository coordination
- Context updates and handoffs
- Common engineering standards

The project context describes:
- Completed work
- Current implementation status
- Known blockers
- Next planned tasks

After meaningful completed tasks:
- Update PROJECT_CONTEXT.md when authorized
  and filesystem permissions allow.
- Record factual progress and verification results.
- Do not overwrite unrelated updates.
- Do not modify approved specifications.

If a required document is inaccessible,
report the issue instead of guessing.


## 6. Engineering Standards

- Keep NestJS modules cohesive.
- Keep controllers thin and services focused.
- Validate incoming requests.
- Enforce wedding-scoped authorization server-side.
- Preserve database constraints and audit requirements.
- Use transactions where consistency requires them.
- Handle errors explicitly.
- Prefer strongly typed, readable code.
- Avoid unnecessary abstractions and dependencies.
- Never silently expand the requested scope.

## 7. Learning and Interview Preparation

When explicitly requested to teach or conduct
interview preparation, read:

`.agents/INTERVIEW_PREP.md`

Follow its learning and interview instructions.

During normal development, remain focused on
implementation, testing and verification.

If the prep file does not exist, report that fact.

## 8. Learning Notes

Learning notes are maintained in:
`../docs/learning/`

When explicitly requested after completing a
meaningful feature:

1. Read the actual implementation and tests.
2. Explain how the feature works.
3. Document important design decisions and trade-offs.
4. Include useful interview questions.
5. Distinguish implemented behavior from planned work.
6. Prepare a concise learning note for developer review.

Do not automatically create learning notes for every
small task.

Do not modify learning notes without authorization
and appropriate filesystem permissions.

Follow `.agents/INTERVIEW_PREP.md` for teaching
and interview preparation behavior.
