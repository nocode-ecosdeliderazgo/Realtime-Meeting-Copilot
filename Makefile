# Realtime Meeting Copilot - Makefile
# Simplifica los comandos comunes de desarrollo

.PHONY: help install dev build start test test-ui e2e lint format type-check clean

# Variables
NODE_VERSION := 20
PNPM_VERSION := 8
WORKSPACE := apps/web

# Default target
help: ## Mostrar esta ayuda
	@echo "Realtime Meeting Copilot - Comandos disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'
	@echo ""
	@echo "Ejemplos:"
	@echo "  make install    # Instalar dependencias"
	@echo "  make dev        # Iniciar servidor de desarrollo"
	@echo "  make build      # Construir para producción"

# Installation and setup
install: ## Instalar todas las dependencias
	@echo "🔧 Instalando dependencias..."
	pnpm install
	@echo "✅ Dependencias instaladas"

install-ci: ## Instalar dependencias para CI (frozen lockfile)
	@echo "🔧 Instalando dependencias (CI)..."
	pnpm install --frozen-lockfile
	@echo "✅ Dependencias instaladas (CI)"

# Development
dev: ## Iniciar servidor de desarrollo
	@echo "🚀 Iniciando servidor de desarrollo..."
	pnpm --filter $(WORKSPACE) dev

dev-debug: ## Iniciar servidor con debug habilitado
	@echo "🐛 Iniciando servidor con debug..."
	DEBUG=* pnpm --filter $(WORKSPACE) dev

# Building
build: ## Construir aplicación para producción
	@echo "🏗️  Construyendo aplicación..."
	pnpm --filter $(WORKSPACE) build
	@echo "✅ Construcción completada"

build-analyze: ## Construir y analizar bundle
	@echo "📊 Construyendo y analizando bundle..."
	ANALYZE=true pnpm --filter $(WORKSPACE) build

# Production
start: ## Iniciar servidor de producción
	@echo "🌐 Iniciando servidor de producción..."
	pnpm --filter $(WORKSPACE) start

# Testing
test: ## Ejecutar tests unitarios
	@echo "🧪 Ejecutando tests unitarios..."
	pnpm --filter $(WORKSPACE) test

test-ui: ## Ejecutar tests con interfaz UI
	@echo "🧪 Ejecutando tests con UI..."
	pnpm --filter $(WORKSPACE) test:ui

test-watch: ## Ejecutar tests en modo watch
	@echo "👀 Ejecutando tests en modo watch..."
	pnpm --filter $(WORKSPACE) test --watch

e2e: ## Ejecutar tests end-to-end
	@echo "🎭 Ejecutando tests E2E..."
	pnpm --filter $(WORKSPACE) e2e

e2e-ui: ## Ejecutar tests E2E con UI
	@echo "🎭 Ejecutando tests E2E con UI..."
	pnpm --filter $(WORKSPACE) e2e --ui

# Code quality
lint: ## Verificar código con linter
	@echo "🔍 Verificando código..."
	pnpm --filter $(WORKSPACE) lint

lint-fix: ## Corregir problemas de linting automáticamente
	@echo "🔧 Corrigiendo problemas de linting..."
	pnpm --filter $(WORKSPACE) lint --fix

format: ## Formatear código
	@echo "✨ Formateando código..."
	pnpm --filter $(WORKSPACE) format

format-check: ## Verificar formato del código
	@echo "📋 Verificando formato..."
	pnpm --filter $(WORKSPACE) format --check

type-check: ## Verificar tipos TypeScript
	@echo "📝 Verificando tipos..."
	pnpm --filter $(WORKSPACE) tsc --noEmit

# Utilities
clean: ## Limpiar archivos generados
	@echo "🧹 Limpiando archivos generados..."
	rm -rf apps/web/.next
	rm -rf apps/web/dist
	rm -rf node_modules/.cache
	@echo "✅ Limpieza completada"

clean-all: ## Limpiar todo incluyendo node_modules
	@echo "🧹 Limpieza completa..."
	rm -rf node_modules
	rm -rf apps/web/node_modules
	rm -rf apps/web/.next
	rm -rf apps/web/dist
	@echo "✅ Limpieza completa terminada"

# Environment setup
setup: ## Configuración inicial del proyecto
	@echo "⚙️  Configurando proyecto..."
	@if [ ! -f .env.local ]; then \
		echo "📄 Creando .env.local desde .env.example..."; \
		cp .env.example .env.local; \
		echo "⚠️  Por favor, configura las variables en .env.local"; \
	fi
	make install
	@echo "✅ Configuración inicial completada"

# Dependency management
upgrade: ## Actualizar dependencias
	@echo "⬆️  Actualizando dependencias..."
	pnpm update --recursive
	@echo "✅ Dependencias actualizadas"

upgrade-interactive: ## Actualizar dependencias interactivamente
	@echo "⬆️  Actualizando dependencias (interactivo)..."
	pnpm update --recursive --interactive

# Database/Data
reset-data: ## Limpiar datos de sesiones
	@echo "🗑️  Limpiando datos de sesiones..."
	rm -rf data/sessions/*.json
	@echo "✅ Datos de sesiones limpiados"

backup-data: ## Hacer backup de los datos
	@echo "💾 Creando backup de datos..."
	mkdir -p backups
	tar -czf backups/sessions-backup-$(shell date +%Y%m%d-%H%M%S).tar.gz data/sessions/
	@echo "✅ Backup creado en backups/"

# Docker
docker-build: ## Construir imagen Docker
	@echo "🐳 Construyendo imagen Docker..."
	docker build -t realtime-meeting-copilot .

docker-run: ## Ejecutar contenedor Docker
	@echo "🐳 Ejecutando contenedor..."
	docker run -p 3000:3000 --env-file .env.local realtime-meeting-copilot

docker-dev: ## Ejecutar en modo desarrollo con Docker
	@echo "🐳 Ejecutando desarrollo con Docker..."
	docker-compose up --build

# Deployment
deploy-vercel: ## Desplegar en Vercel
	@echo "🚀 Desplegando en Vercel..."
	vercel deploy --prod

deploy-preview: ## Crear preview deployment
	@echo "👀 Creando preview deployment..."
	vercel deploy

# Monitoring and health checks
health-check: ## Verificar salud de APIs
	@echo "🏥 Verificando APIs..."
	@curl -s http://localhost:3000/api/tasks/linear > /dev/null && echo "✅ Linear API OK" || echo "❌ Linear API Error"
	@curl -s http://localhost:3000/api/tasks/coda > /dev/null && echo "✅ Coda API OK" || echo "❌ Coda API Error"

check-env: ## Verificar variables de entorno
	@echo "🔍 Verificando variables de entorno..."
	@node -e "
		const required = ['OPENAI_API_KEY'];
		const optional = ['LINEAR_API_KEY', 'CODA_API_TOKEN'];
		const env = process.env;
		
		console.log('📋 Variables requeridas:');
		required.forEach(key => {
			const status = env[key] ? '✅' : '❌';
			console.log(\`  \${status} \${key}\`);
		});
		
		console.log('\\n📋 Variables opcionales:');
		optional.forEach(key => {
			const status = env[key] ? '✅' : '⚪';
			console.log(\`  \${status} \${key}\`);
		});
	"

# Development helpers
logs: ## Mostrar logs del servidor
	@echo "📄 Mostrando logs..."
	tail -f apps/web/.next/trace

open: ## Abrir aplicación en el navegador
	@echo "🌐 Abriendo aplicación..."
	open http://localhost:3000

# Git helpers
commit-lint: ## Verificar código antes de commit
	make lint
	make type-check
	make test
	@echo "✅ Código listo para commit"

pre-push: ## Verificaciones antes de push
	make commit-lint
	make build
	@echo "✅ Código listo para push"

# Project information
info: ## Mostrar información del proyecto
	@echo "📊 Información del proyecto:"
	@echo "  Node version: $(shell node --version)"
	@echo "  pnpm version: $(shell pnpm --version)"
	@echo "  Next.js version: $(shell pnpm --filter $(WORKSPACE) list next --depth=0 2>/dev/null | grep next || echo 'No encontrado')"
	@echo "  TypeScript version: $(shell pnpm --filter $(WORKSPACE) list typescript --depth=0 2>/dev/null | grep typescript || echo 'No encontrado')"
	@echo "  Workspace: $(WORKSPACE)"

size: ## Mostrar tamaño del bundle
	@echo "📏 Tamaño del proyecto:"
	@du -sh apps/web/.next 2>/dev/null || echo "No hay build disponible"
	@echo "Archivos TypeScript:"
	@find apps/web/src -name "*.ts" -o -name "*.tsx" | wc -l | awk '{print "  " $$1 " archivos"}'
	@echo "Líneas de código:"
	@find apps/web/src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1 | awk '{print "  " $$1 " líneas"}'