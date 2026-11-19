# T1D India - Makefile for Common Development Tasks
# Usage: make <target>

.PHONY: help install dev build test lint db-up db-down db-migrate db-seed docker-up docker-down docker-logs clean

# Default target
help:
	@echo "T1D India - Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install          Install all dependencies"
	@echo "  make dev              Start development servers"
	@echo ""
	@echo "Database:"
	@echo "  make db-up            Start PostgreSQL + Redis (Docker)"
	@echo "  make db-down          Stop database containers"
	@echo "  make db-migrate       Run Prisma migrations"
	@echo "  make db-seed          Seed database with Indian foods"
	@echo "  make db-studio        Open Prisma Studio"
	@echo "  make db-reset         Reset database (migrate + seed)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        Start all services (PostgreSQL, Redis, MinIO, Prometheus, Grafana)"
	@echo "  make docker-down      Stop all services"
	@echo "  make docker-logs      View docker logs"
	@echo "  make docker-build     Build all Docker images"
	@echo ""
	@echo "Development:"
	@echo "  make build            Build all packages"
	@echo "  make test             Run all tests"
	@echo "  make test-api         Run API tests only"
	@echo "  make test-ml          Run ML service tests only"
	@echo "  make lint             Lint all packages"
	@echo "  make typecheck        Type-check all packages"
	@echo "  make format           Format code with Prettier"
	@echo ""
	@echo "ML Service:"
	@echo "  make ml-install       Install ML service dependencies"
	@echo "  make ml-dev           Start ML service dev server"
	@echo "  make ml-test          Run ML service tests"
	@echo ""
	@echo "Deployment:"
	@echo "  make helm-template    Render Helm templates locally"
	@echo "  make helm-install     Install Helm chart to cluster"
	@echo "  make helm-upgrade     Upgrade Helm release"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean            Remove build artifacts and node_modules"
	@echo "  make fresh            Clean install (clean + install)"

# ============================================
# Setup
# ============================================

install:
	npm ci

# ============================================
# Development
# ============================================

demo:
	./scripts/start-demo.sh

demo-ml:
	./scripts/start-demo.sh --with-ml

dev:
	npm run dev:api & npm run dev:ml

dev-api:
	npm run dev --workspace=apps/api

dev-ml:
	npm run dev --workspace=apps/ml-service

build:
	npm run build

build-api:
	npm run build --workspace=apps/api

build-ml:
	npm run build --workspace=apps/ml-service

build-shared:
	npm run build --workspace=packages/shared

# ============================================
# Testing
# ============================================

test:
	npm test

test-api:
	npm run test --workspace=apps/api

test-ml:
	cd apps/ml-service && python -m pytest tests/ -v

test-coverage:
	npm run test -- --coverage

# ============================================
# Linting & Formatting
# ============================================

lint:
	npm run lint

lint-fix:
	npm run lint -- --fix

typecheck:
	npm run typecheck

format:
	npx prettier --write "**/*.{ts,tsx,json,md,yaml,yml}"

format-check:
	npx prettier --check "**/*.{ts,tsx,json,md,yaml,yml}"

# ============================================
# Database
# ============================================

db-up:
	docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis

db-down:
	docker compose -f infrastructure/docker/docker-compose.yml down postgres redis

db-migrate:
	npm run db:migrate --workspace=apps/api

db-migrate-prod:
	npm run db:migrate:prod --workspace=apps/api

db-seed:
	npm run db:seed --workspace=apps/api

db-studio:
	npm run db:studio --workspace=apps/api

db-reset:
	npm run db:migrate --workspace=apps/api && npm run db:seed --workspace=apps/api

db-generate:
	npm run db:generate --workspace=apps/api

# ============================================
# Docker
# ============================================

docker-up:
	docker compose -f infrastructure/docker/docker-compose.yml up -d

docker-down:
	docker compose -f infrastructure/docker/docker-compose.yml down

docker-down-volumes:
	docker compose -f infrastructure/docker/docker-compose.yml down -v

docker-logs:
	docker compose -f infrastructure/docker/docker-compose.yml logs -f

docker-logs-api:
	docker compose -f infrastructure/docker/docker-compose.yml logs -f api

docker-logs-ml:
	docker compose -f infrastructure/docker/docker-compose.yml logs -f ml

docker-build:
	docker compose -f infrastructure/docker/docker-compose.yml build

docker-rebuild:
	docker compose -f infrastructure/docker/docker-compose.yml build --no-cache

docker-ps:
	docker compose -f infrastructure/docker/docker-compose.yml ps

# ============================================
# ML Service
# ============================================

ml-install:
	cd apps/ml-service && pip install -r requirements.txt

ml-dev:
	cd apps/ml-service && python -m uvicorn src.main:app --reload --port 8000

ml-test:
	cd apps/ml-service && python -m pytest tests/ -v --cov=src

ml-format:
	cd apps/ml-service && black src/ && isort src/

# ============================================
# Helm/Kubernetes
# ============================================

helm-template:
	helm template t1d-india ./infrastructure/helm/t1d-india \
		--namespace t1d-staging \
		--set environment=staging \
		--set api.image.tag=latest \
		--set ml.image.tag=latest

helm-install:
	helm upgrade --install t1d-india ./infrastructure/helm/t1d-india \
		--namespace t1d-staging --create-namespace \
		--set environment=staging

helm-upgrade:
	helm upgrade t1d-india ./infrastructure/helm/t1d-india \
		--namespace t1d-staging

helm-uninstall:
	helm uninstall t1d-india --namespace t1d-staging

helm-lint:
	helm lint ./infrastructure/helm/t1d-india

# ============================================
# Utilities
# ============================================

clean:
	rm -rf node_modules
	rm -rf apps/api/node_modules
	rm -rf apps/api/dist
	rm -rf apps/ml-service/__pycache__
	rm -rf apps/ml-service/.pytest_cache
	rm -rf packages/shared/node_modules
	rm -rf packages/shared/dist
	rm -rf .turbo
	find . -name "*.tsbuildinfo" -delete

fresh: clean install

# ============================================
# CI Simulation
# ============================================

ci: lint typecheck test build
	@echo "All CI checks passed!"

# ============================================
# Documentation
# ============================================

docs-serve:
	npx serve docs

docs-build:
	@echo "Documentation in README.md, IMPLEMENTATION_PLAN.md, TECHNICAL_DEEP_DIVE.md"