# Agente IA - Núcleo Operativo v2

## Descripción

Sistema autónomo de inteligencia artificial capaz de recibir órdenes en lenguaje natural, interpretarlas, planificar su ejecución, seleccionar herramientas, ejecutar operaciones autorizadas y entregar resultados verificables.

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    INTERFAZ (React)                      │
│  ChatInterface │ TaskPanel │ ToolsPanel │ SystemStatus   │
├─────────────────────────────────────────────────────────┤
│                    MOTOR (Core)                          │
│  Engine │ Interpreter │ Planner │ Executor │ QwenAdapter │
├─────────────────────────────────────────────────────────┤
│                  HERRAMIENTAS (Tools)                    │
│  TextAnalyzer │ Calculator │ KnowledgeBase │ Reports     │
│  SystemMonitor │ MemoryStore │ Exporter                  │
├─────────────────────────────────────────────────────────┤
│                   SERVIDOR (Backend)                     │
│  API Endpoints │ Database Service │ Auth │ Audit         │
├─────────────────────────────────────────────────────────┤
│                  PERSISTENCIA                            │
│  PostgreSQL (producción) │ localStorage (fallback)       │
└─────────────────────────────────────────────────────────┘
```

## Estado de la Segunda Entrega

### ✅ Funcionalidades Verificadas (Pruebas Pasadas)

| Componente | Estado | Detalles |
|-----------|--------|----------|
| Intérprete local | ✅ Operativo | 10 patrones de intención, 5 tipos de entidades |
| Planificador | ✅ Operativo | Genera planes con tareas priorizadas |
| Analizador de texto | ✅ Operativo | Estadísticas, sentimiento, idioma, legibilidad |
| Calculadora | ✅ Operativo | Suma, promedio, producto, máx, mín, desviación |
| Base de conocimiento | ✅ Operativo | 8 entradas con búsqueda por relevancia |
| Generador de reportes | ✅ Operativo | Reportes estructurados con métricas |
| Monitor del sistema | ✅ Operativo | Diagnóstico de 7 herramientas |
| Almacén de memoria | ✅ Operativo | Persistencia en localStorage |
| Exportador | ✅ Operativo | JSON, CSV, HTML, texto plano |
| Validación de entradas | ✅ Operativo | Todos los endpoints validados |
| Sistema de roles | ✅ Operativo | admin, operator, viewer, auditor |
| Registro de auditoría | ✅ Operativo | Cada operación con ID, timestamp, estado |
| Ciclo completo | ✅ Operativo | Orden → Interpretación → Plan → Ejecución → Resultado |

### ⚙️ Funcionalidades Pendientes de Configuración

| Componente | Requisito | Estado |
|-----------|-----------|--------|
| Qwen API | VITE_QWEN_API_KEY | Código listo, requiere credencial |
| PostgreSQL | Servidor de BD | Migraciones creadas, requiere conexión |
| Backend Vercel | Despliegue | Endpoints diseñados, requiere deploy |
| GitHub Actions | Repo público | Config lista, requiere activación |

### 🚫 Funcionalidades Bloqueadas

| Componente | Bloqueo |
|-----------|---------|
| Llamadas reales a Qwen | Sin API key configurada |
| Persistencia PostgreSQL | Sin servidor de BD accesible |
| Despliegue Vercel | Sin acceso a GitHub/Vercel |

## Estructura de Archivos

```
src/
├── App.tsx                    # Componente principal
├── types/index.ts             # Tipos TypeScript
├── core/
│   ├── engine.ts              # Motor principal (v2 con Qwen)
│   ├── interpreter.ts         # Intérprete de lenguaje natural
│   ├── planner.ts             # Planificador de tareas
│   ├── executor.ts            # Ejecutor de herramientas
│   └── qwenAdapter.ts         # Adaptador Qwen (API real)
├── tools/
│   ├── textAnalyzer.ts        # Análisis de texto
│   ├── calculator.ts          # Operaciones matemáticas
│   ├── knowledgeBase.ts       # Base de conocimiento
│   ├── reportGenerator.ts     # Generación de reportes
│   ├── systemMonitor.ts       # Diagnóstico del sistema
│   ├── memoryStore.ts         # Memoria persistente
│   └── exporter.ts            # Exportación multi-formato
├── server/
│   ├── database.ts            # Servicio de base de datos
│   └── api.ts                 # Endpoints del backend
├── components/
│   ├── ChatInterface.tsx      # Interfaz de conversación
│   ├── TaskPanel.tsx          # Panel de seguimiento
│   ├── ToolsPanel.tsx         # Visor de herramientas
│   ├── QwenConfigPanel.tsx    # Configuración de Qwen
│   └── SystemStatus.tsx       # Estado del sistema
├── hooks/
│   └── useAgent.ts            # Hook de estado del agente
└── tests/
    ├── setup.ts               # Configuración de pruebas
    ├── interpreter.test.ts    # Pruebas del intérprete
    ├── planner.test.ts        # Pruebas del planificador
    ├── tools.test.ts          # Pruebas de herramientas
    ├── integration.test.ts    # Prueba integral completa
    └── security.test.ts       # Pruebas de seguridad

sql/
└── migrations/
    └── 001_initial_schema.sql # Esquema PostgreSQL completo
```

## Ejecución

### Desarrollo
```bash
npm run dev
```

### Pruebas
```bash
npx vitest run
```

### Build
```bash
npm run build
```

## Configuración de Qwen

1. Obtén una API key en [DashScope](https://dashscope.console.aliyun.com/)
2. Configura en la interfaz (panel Estado → Qwen → Configurar)
3. O establece `VITE_QWEN_API_KEY` en `.env`

## Migraciones PostgreSQL

```bash
# Ejecutar migración inicial
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -f sql/migrations/001_initial_schema.sql
```

## Seguridad

- ✅ Validación de todas las entradas
- ✅ Sistema de roles (admin, operator, viewer, auditor)
- ✅ Aprobación requerida para operaciones sensibles
- ✅ Registro de auditoría de todas las operaciones
- ✅ Protección contra inyección de instrucciones
- ⚠️ API keys en variables de entorno (no en código)
- ⚠️ PostgreSQL con SSL en producción

## Ciclo de Ejecución

```
1. Recepción de orden (usuario)
2. Interpretación (Qwen o intérprete local)
3. Generación del plan (planificador)
4. Validación del plan
5. Selección de herramientas
6. Comprobación de permisos
7. Solicitud de aprobación (si aplica)
8. Ejecución de operaciones
9. Verificación de resultados
10. Persistencia de evidencias
11. Entrega de respuesta final
```

## Licencia

Privado - Uso interno
