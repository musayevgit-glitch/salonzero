# ADR-0001: Monorepo with pnpm workspaces + Turborepo

## Status
Accepted

## Decision
Use a single repository with pnpm workspaces and Turborepo, per the playbook's final stack decision.

## Rationale
Three apps (web, dashboard, api) share a design system, validation schemas, and auth/contract types.
A monorepo keeps these in sync without publishing internal packages, and Turborepo gives cached,
parallelized builds/tests/lint across packages.

## Alternatives considered
Separate repos per app — rejected: would require versioning and publishing `ui`/`validation`/`contracts`,
adding release overhead with no MVP benefit.

## Consequences
CI must run affected-only Turborepo pipelines to stay fast as the repo grows.
