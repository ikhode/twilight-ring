-- Add security metadata to audit_logs
ALTER TABLE audit_logs ADD COLUMN client_ip TEXT;
ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN hash TEXT;

-- Create permissions table
CREATE TABLE permissions (
    id VARCHAR PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL
);

-- Create role_permissions table
CREATE TABLE role_permissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    role "role" NOT NULL,
    permission_id VARCHAR NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
);

-- Create custom_roles table
CREATE TABLE custom_roles (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create custom_role_permissions table
CREATE TABLE custom_role_permissions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id VARCHAR NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
    permission_id VARCHAR NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
);

-- Seed Initial Permissions
INSERT INTO permissions (id, name, description, category) VALUES
('inventory.read', 'Leer Inventario', 'Permite ver el stock y lista de productos', 'inventory'),
('inventory.write', 'Modificar Inventario', 'Permite agregar o editar productos y ajustes de stock', 'inventory'),
('finance.read', 'Ver Finanzas', 'Permite ver balances y estados financieros', 'finance'),
('finance.write', 'Gestión Financiera', 'Permite registrar gastos y pagos', 'finance'),
('finance.void', 'Anular Transacciones', 'Permite anular facturas o pagos realizados', 'finance'),
('hr.read', 'Ver Personal', 'Permite ver nómina y expedientes de empleados', 'hr'),
('hr.write', 'Gestión de Personal', 'Permite contratar y editar datos de empleados', 'hr'),
('admin.full', 'Acceso Total', 'Permiso maestro para administración del sistema', 'admin');

-- Map Default Roles to Permissions
INSERT INTO role_permissions (role, permission_id) VALUES
('admin', 'inventory.read'), ('admin', 'inventory.write'), ('admin', 'finance.read'), ('admin', 'finance.write'), ('admin', 'finance.void'), ('admin', 'hr.read'), ('admin', 'hr.write'), ('admin', 'admin.full'),
('manager', 'inventory.read'), ('manager', 'inventory.write'), ('manager', 'finance.read'), ('manager', 'finance.write'), ('manager', 'hr.read'),
('user', 'inventory.read'), ('user', 'finance.read'),
('cashier', 'inventory.read'), ('finance.read');
-- Note: Cashier should have specific POS permissions too, adding them later.
