-- ============================================================
-- MIGRACIÓN 001: Esquema inicial del Agente IA
-- Fecha: 2025-01-15
-- Descripción: Tablas base para usuarios, órdenes, planes, tareas,
--              ejecuciones, herramientas, aprobaciones y auditoría.
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: users
-- Usuarios del sistema con roles y autenticación
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operator',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_role CHECK (role IN ('admin', 'operator', 'viewer', 'auditor'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- TABLA: orders
-- Órdenes recibidas por el agente
-- ============================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_input TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    interpretation JSONB,
    priority INTEGER NOT NULL DEFAULT 1,
    source VARCHAR(100) DEFAULT 'chat',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT valid_order_status CHECK (status IN (
        'pending', 'interpreting', 'planning', 'executing',
        'awaiting_approval', 'completed', 'failed', 'cancelled'
    ))
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ============================================================
-- TABLA: plans
-- Planes de ejecución generados para cada orden
-- ============================================================
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    estimated_duration INTEGER,
    generated_by VARCHAR(100) NOT NULL DEFAULT 'local_planner',
    plan_data JSONB NOT NULL,
    validation_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_plan_status CHECK (status IN (
        'draft', 'validated', 'approved', 'executing', 'completed', 'failed'
    ))
);

CREATE INDEX idx_plans_order_id ON plans(order_id);
CREATE INDEX idx_plans_status ON plans(status);

-- ============================================================
-- TABLA: tasks
-- Tareas individuales dentro de un plan
-- ============================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tool_id VARCHAR(100) NOT NULL,
    parameters JSONB DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 1,
    dependencies UUID[] DEFAULT '{}',
    result JSONB,
    error JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_task_status CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'skipped', 'timeout'
    ))
);

CREATE INDEX idx_tasks_plan_id ON tasks(plan_id);
CREATE INDEX idx_tasks_order_id ON tasks(order_id);
CREATE INDEX idx_tasks_tool_id ON tasks(tool_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ============================================================
-- TABLA: tool_registry
-- Registro de herramientas disponibles
-- ============================================================
CREATE TABLE tool_registry (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    parameters_schema JSONB DEFAULT '{}',
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    requires_secrets BOOLEAN NOT NULL DEFAULT false,
    max_execution_time INTEGER DEFAULT 30000,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_tool_status CHECK (status IN (
        'available', 'busy', 'error', 'disabled', 'maintenance'
    ))
);

-- Insertar herramientas iniciales
INSERT INTO tool_registry (id, name, description, parameters_schema, requires_approval, requires_secrets) VALUES
('text_analyzer', 'Analizador de Texto', 'Analiza contenido textual: estadísticas, frecuencia, sentimiento, idioma.', '{"type":"object","properties":{"text":{"type":"string"},"analysisType":{"type":"string"}}}', false, false),
('calculator', 'Calculadora y Estadísticas', 'Operaciones matemáticas y análisis estadístico.', '{"type":"object","properties":{"expression":{"type":"string"},"entities":{"type":"array"}}}', false, false),
('knowledge_base', 'Base de Conocimiento', 'Búsqueda en base de conocimiento local.', '{"type":"object","properties":{"query":{"type":"string"}}}', false, false),
('report_generator', 'Generador de Reportes', 'Genera reportes estructurados.', '{"type":"object","properties":{"input":{"type":"string"},"format":{"type":"string"}}}', false, false),
('system_monitor', 'Monitor del Sistema', 'Diagnóstico del sistema.', '{"type":"object","properties":{"checkAll":{"type":"boolean"}}}', false, false),
('memory_store', 'Almacén de Memoria', 'Gestión de memoria persistente.', '{"type":"object","properties":{"input":{"type":"string"}}}', false, false),
('exporter', 'Exportador de Datos', 'Exporta datos en JSON, CSV, HTML, texto.', '{"type":"object","properties":{"input":{"type":"string"},"format":{"type":"string"}}}', false, false);

-- ============================================================
-- TABLA: approvals
-- Registro de aprobaciones y rechazos
-- ============================================================
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reason TEXT,
    approval_comment TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    
    CONSTRAINT valid_approval_status CHECK (status IN (
        'pending', 'approved', 'rejected', 'expired'
    ))
);

CREATE INDEX idx_approvals_order_id ON approvals(order_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_requested_by ON approvals(requested_by);

-- ============================================================
-- TABLA: operation_logs
-- Registro de auditoría de todas las operaciones
-- ============================================================
CREATE TABLE operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tool_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    parameters JSONB,
    result_summary TEXT,
    duration_ms INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_log_status CHECK (status IN (
        'success', 'error', 'warning', 'info'
    ))
);

CREATE INDEX idx_operation_logs_order_id ON operation_logs(order_id);
CREATE INDEX idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_tool_id ON operation_logs(tool_id);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at DESC);

-- ============================================================
-- TABLA: memory_entries
-- Memoria persistente del agente
-- ============================================================
CREATE TABLE memory_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    tags TEXT[] DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, key)
);

CREATE INDEX idx_memory_entries_user_id ON memory_entries(user_id);
CREATE INDEX idx_memory_entries_tags ON memory_entries USING GIN(tags);

-- ============================================================
-- TABLA: ai_model_configs
-- Configuración de modelos de IA
-- ============================================================
CREATE TABLE ai_model_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    max_tokens INTEGER DEFAULT 2000,
    temperature DECIMAL(3,2) DEFAULT 0.3,
    timeout_ms INTEGER DEFAULT 30000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tool_registry_updated_at BEFORE UPDATE ON tool_registry
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_memory_entries_updated_at BEFORE UPDATE ON memory_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_model_configs_updated_at BEFORE UPDATE ON ai_model_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
