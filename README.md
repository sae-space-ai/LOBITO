# Agente IA - Núcleo Operativo v3

## 🎯 Descripción

Sistema autónomo de inteligencia artificial capaz de recibir órdenes en lenguaje natural, interpretarlas mediante Qwen, planificar su ejecución, seleccionar herramientas, ejecutar operaciones autorizadas y entregar resultados verificables con persistencia en PostgreSQL.

## 🏗️ Arquitectura v3

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│  ChatInterface │ TaskPanel │ ToolsPanel │ SystemStatus          │
│  ⚠️ SIN credenciales - Solo UI y lógica de presentación        │
├─────────────────────────────────────────────────────────────────┤
│                    BACKEND (Vercel Serverless)                   │
│  /api/commands/* │ /api/qwen/* │ /api/tools │ /api/health      │
│  🔐 QWEN_API_KEY │ 🔐 DATABASE_URL │ 🔐 JWT_SECRET             │
├─────────────────────────────────────────────────────────────────┤
│                    SERVICIOS (Backend)                           │
│  Qwen Service │ PostgreSQL Service │ Auth Service               │
├─────────────────────────────────────────────────────────────────┤
│                  HERRAMIENTAS (7 herramientas)                   │
│  TextAnalyzer │ Calculator │ KnowledgeBase │ Reports            │
│  SystemMonitor │ MemoryStore │ Exporter                          │
├─────────────────────────────────────────────────────────────────┤
│                  PERSISTENCIA                                    │
│  PostgreSQL (producción) │ localStorage (fallback UI)           │
└─────────────────────────────────────────────────────────────────┘
```

## 🔒 Seguridad v3

### ✅ Implementado

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Credenciales Qwen | ✅ Seguro | Solo en servidor (QWEN_API_KEY) |
| Credenciales BD | ✅ Seguro | Solo en servidor (DATABASE_URL) |
| JWT Secret | ✅ Seguro | Solo en servidor (JWT_SECRET) |
| Llamadas a Qwen | ✅ Seguro | Proxy vía /api/qwen/interpret |
| Validación inputs | ✅ Seguro | Todos los endpoints validan |
| Autenticación | ✅ Seguro | Bearer token en todos los endpoints |
| Autorización | ✅ Seguro | Roles: admin, operator, viewer, auditor |
| Auditoría | ✅ Seguro | operation_logs registra todo |
| Frontend limpio | ✅ Verificado | Sin VITE_QWEN_API_KEY ni similares |
| Bundle limpio | ✅ Verificado | Sin endpoints de Qwen expuestos |

### 🚫 NUNCA en el Frontend

- ❌ VITE_QWEN_API_KEY
- ❌ VITE_DATABASE_PASSWORD
- ❌ VITE_JWT_SECRET
- ❌ Llamadas directas a dashscope.aliyuncs.com
- ❌ Conexión directa a PostgreSQL

## 📁 Estructura de Archivos

```
├── api/                          # Backend Vercel Serverless
│   ├── commands/
│   │   ├── index.post.ts        # POST /api/commands
│   │   ├── index.get.ts         # GET /api/commands
│   │   └── [id]/
│   │       ├── index.get.ts     # GET /api/commands/:id
│   │       ├── execute.ts       # POST /api/commands/:id/execute
│   │       └── approve.ts       # POST /api/commands/:id/approve
│   ├── qwen/
│   │   └── interpret.ts         # POST /api/qwen/interpret (proxy seguro)
│   ├── tools.ts                  # GET /api/tools
│   └── health.ts                 # GET /api/health
├── src/
│   ├── core/
│   │   ├── engine.ts            # Motor principal
│   │   ├── interpreter.ts       # Intérprete local (fallback)
│   │   ├── planner.ts           # Planificador
│   │   ├── executor.ts          # Ejecutor
│   │   └── qwenAdapter.ts       # Adaptador Qwen (usa backend)
│   ├── server/lib/
│   │   ├── database.ts          # Servicio PostgreSQL (backend)
│   │   ├── qwen.ts              # Servicio Qwen (backend)
│   │   └── auth.ts              # Servicio autenticación
│   ├── tools/                   # 7 herramientas
│   ├── components/              # UI
│   ├── hooks/                   # React hooks
│   └── tests/                   # Pruebas Vitest
├── sql/migrations/
│   └── 001_initial_schema.sql   # Esquema PostgreSQL
├── .github/workflows/
│   └── ci.yml                   # GitHub Actions CI/CD
├── vercel.json                  # Configuración Vercel
└── .env.example                 # Variables de entorno
```

## 🚀 Despliegue

### 1. Configurar Variables de Entorno en Vercel

```bash
# En el dashboard de Vercel → Settings → Environment Variables
QWEN_API_KEY=sk-xxxxx              # De DashScope
DATABASE_URL=postgresql://...      # De tu proveedor de BD
JWT_SECRET=tu-secreto-jwt          # Generar con: openssl rand -hex 32
API_KEY=tu-api-key                 # Para autenticación de API
```

### 2. Ejecutar Migraciones PostgreSQL

```bash
psql $DATABASE_URL < sql/migrations/001_initial_schema.sql
```

### 3. Desplegar

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel --prod
```

## 🧪 Pruebas

```bash
# Instalar dependencias
npm install

# Ejecutar pruebas
npm test

# Type check
npm run typecheck

# Build producción
npm run build
```

## 📊 Estado de la Tercera Entrega

### ✅ Componentes Operativos (Verificados)

| Componente | Estado | Verificación |
|-----------|--------|--------------|
| Frontend React | ✅ Build exitoso | `npm run build` ✓ |
| Backend endpoints | ✅ Código completo | 7 endpoints implementados |
| Seguridad | ✅ Verificada | Sin credenciales en frontend |
| Bundle limpio | ✅ Verificado | Sin VITE_* sensibles |
| Migraciones SQL | ✅ Creadas | Esquema completo |
| GitHub Actions | ✅ Configurado | CI/CD pipeline |
| Vercel config | ✅ Listo | vercel.json creado |
| Pruebas | ✅ Escritas | 61 tests en src/tests/ |

### ⚙️ Pendientes de Configuración Externa

| Componente | Requisito | Cómo desbloquear |
|-----------|-----------|------------------|
| Qwen API | QWEN_API_KEY en Vercel | Configurar en dashboard |
| PostgreSQL | DATABASE_URL en Vercel | Configurar en dashboard |
| GitHub repo | Acceso a GitHub | git push + conectar en Vercel |
| Despliegue | Vercel token | vercel --prod |

### 🚫 No Verificados (Honestidad Técnica)

| Componente | Razón |
|-----------|-------|
| Llamadas reales a Qwen | Sin API key configurada |
| Conexión real a PostgreSQL | Sin servidor de BD accesible |
| Ejecución de pruebas Vitest | Entorno sin runner de tests |
| Despliegue en Vercel | Sin acceso a Vercel/GitHub |

## 🔄 Ciclo de Ejecución Completo

```
1. Usuario → Frontend → POST /api/commands
2. Backend valida input y autenticación
3. Backend → Qwen API (interpretación)
4. Backend genera plan de tareas
5. Backend → PostgreSQL (persiste orden)
6. Backend → Ejecuta herramientas autorizadas
7. Backend → PostgreSQL (persiste resultados)
8. Backend → Frontend (respuesta estructurada)
9. Frontend muestra resultado verificable
```

## 📝 Variables de Entorno

### Servidor (PRIVADAS - NUNCA en frontend)

```bash
QWEN_API_KEY=           # API key de DashScope
QWEN_ENDPOINT=          # Endpoint de Qwen (default: DashScope)
QWEN_MODEL=             # Modelo (default: qwen-turbo)
DATABASE_URL=           # Connection string PostgreSQL
JWT_SECRET=             # Secreto para JWT
API_KEY=                # API key para autenticación
```

### Frontend (PÚBLICAS - Sin secretos)

```bash
VITE_APP_NAME=          # Nombre de la app
VITE_APP_VERSION=       # Versión
VITE_API_BASE_URL=      # URL del backend (opcional)
```

## 🛡️ Características de Seguridad

1. **Aislamiento de credenciales**: Solo el servidor tiene acceso a API keys
2. **Proxy seguro**: Frontend nunca llama directamente a servicios externos
3. **Validación estricta**: Todos los inputs validados y sanitizados
4. **Autenticación**: Bearer token en todos los endpoints
5. **Autorización por roles**: admin, operator, viewer, auditor
6. **Auditoría completa**: operation_logs registra cada acción
7. **Protección contra inyección**: Sanitización de inputs
8. **Rate limiting**: Preparado para implementar en Vercel
9. **CORS configurado**: Solo orígenes permitidos
10. **SSL/TLS**: HTTPS obligatorio en producción

## 📚 Documentación Adicional

- [Migraciones SQL](sql/migrations/001_initial_schema.sql)
- [Endpoints API](api/)
- [Pruebas](src/tests/)
- [GitHub Actions](.github/workflows/ci.yml)

## 📄 Licencia

Privado - Uso interno

---

**Versión**: 3.0.0  
**Última actualización**: 2025-01-15  
**Estado**: Arquitectura completa, lista para despliegue con configuración externa
