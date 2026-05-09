.DEFAULT_GOAL := help
.PHONY: help install dev verify lint format format-fix typecheck test e2e e2e-ui build

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_-]+:.*?## / {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies (frozen lockfile, mirrors CI)
	bun install --frozen-lockfile

dev: ## Run the dev server (port 3000)
	bun run dev

verify: lint format typecheck test build ## Full preflight — mirrors the CI pipeline exactly

lint: ## Biome lint
	bun run lint

format: ## Biome format check (no writes)
	bun run format

format-fix: ## Biome lint + format auto-fix (writes)
	bun run check:fix

typecheck: ## Typecheck with tsgo
	bun run typecheck

test: ## Run the vitest suite
	bun run test

e2e: ## Run Playwright E2E specs (chromium, prod build)
	bun run e2e

e2e-ui: ## Open Playwright UI runner for interactive debugging
	bun run e2e:ui

build: ## Production build
	bun run build
