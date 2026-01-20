/**
 * SQL Query Validator
 * Validates and sanitizes SQL queries to prevent injection and unauthorized access
 */

interface ValidationResult {
    valid: boolean;
    sanitized?: string;
    error?: string;
}

export class QueryValidator {

    // Dangerous SQL keywords that should be blocked
    private readonly BLOCKED_KEYWORDS = [
        'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE',
        'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'DECLARE', 'SET',
        'UNION', 'INTO', 'OUTFILE', 'DUMPFILE', 'LOAD_FILE'
    ];

    // Allowed SQL keywords for SELECT queries
    private readonly ALLOWED_KEYWORDS = [
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE',
        'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS',
        'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'COUNT',
        'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT', 'BETWEEN', 'IS', 'NULL',
        'ASC', 'DESC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ];

    /**
     * Validate a SQL query
     */
    validate(
        sql: string,
        allowedTables: string[],
        organizationId: string
    ): ValidationResult {
        // 1. Check for blocked keywords
        const upperSQL = sql.toUpperCase();
        for (const keyword of this.BLOCKED_KEYWORDS) {
            if (upperSQL.includes(keyword)) {
                return {
                    valid: false,
                    error: `Query contiene palabra clave no permitida: ${keyword}`
                };
            }
        }

        // 2. Must start with SELECT
        if (!upperSQL.trim().startsWith('SELECT')) {
            return {
                valid: false,
                error: 'Solo se permiten queries SELECT'
            };
        }

        // 3. Check for organization_id filter
        if (!upperSQL.includes('ORGANIZATION_ID')) {
            return {
                valid: false,
                error: 'Query debe incluir filtro de organization_id'
            };
        }

        // 4. Verify organization_id value matches
        const orgIdPattern = new RegExp(`organization_id\\s*=\\s*['"]${organizationId}['"]`, 'i');
        if (!orgIdPattern.test(sql)) {
            return {
                valid: false,
                error: 'El organization_id en la query no coincide con el usuario'
            };
        }

        // 5. Extract table names and verify against whitelist
        const tableNames = this.extractTableNames(sql);
        for (const table of tableNames) {
            if (!allowedTables.includes(table.toLowerCase())) {
                return {
                    valid: false,
                    error: `Tabla no permitida para este rol: ${table}`
                };
            }
        }

        // 6. Ensure LIMIT clause exists
        if (!upperSQL.includes('LIMIT')) {
            // Add LIMIT 100 if not present
            sql = sql.trim();
            if (sql.endsWith(';')) {
                sql = sql.slice(0, -1);
            }
            sql += ' LIMIT 100';
        } else {
            // Verify LIMIT is not too high
            const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
            if (limitMatch) {
                const limit = parseInt(limitMatch[1]);
                if (limit > 100) {
                    sql = sql.replace(/LIMIT\s+\d+/i, 'LIMIT 100');
                }
            }
        }

        // 7. Check for suspicious patterns
        if (this.hasSuspiciousPatterns(sql)) {
            return {
                valid: false,
                error: 'Query contiene patrones sospechosos'
            };
        }

        return {
            valid: true,
            sanitized: sql
        };
    }

    /**
     * Extract table names from SQL query
     */
    private extractTableNames(sql: string): string[] {
        const tables: string[] = [];

        // Match FROM clause
        const fromMatch = sql.match(/FROM\s+([a-z_][a-z0-9_]*)/gi);
        if (fromMatch) {
            fromMatch.forEach(match => {
                const tableName = match.replace(/FROM\s+/i, '').trim();
                tables.push(tableName);
            });
        }

        // Match JOIN clauses
        const joinMatch = sql.match(/JOIN\s+([a-z_][a-z0-9_]*)/gi);
        if (joinMatch) {
            joinMatch.forEach(match => {
                const tableName = match.replace(/JOIN\s+/i, '').trim();
                tables.push(tableName);
            });
        }

        return tables;
    }

    /**
     * Check for suspicious SQL injection patterns
     */
    private hasSuspiciousPatterns(sql: string): boolean {
        const suspiciousPatterns = [
            /--/,                    // SQL comments
            /\/\*/,                  // Multi-line comments
            /;.*SELECT/i,            // Multiple statements
            /xp_/i,                  // SQL Server extended procedures
            /sp_/i,                  // SQL Server stored procedures
            /0x[0-9a-f]+/i,         // Hex values
            /char\s*\(/i,           // CHAR function
            /concat\s*\(/i,         // String concatenation
            /sleep\s*\(/i,          // Time-based injection
            /benchmark\s*\(/i,      // Benchmark function
            /waitfor\s+delay/i,     // SQL Server delay
            /pg_sleep/i,            // PostgreSQL sleep
            /information_schema/i,  // System tables
            /pg_catalog/i           // PostgreSQL catalog
        ];

        return suspiciousPatterns.some(pattern => pattern.test(sql));
    }

    /**
     * Sanitize user input before using in SQL
     */
    sanitizeInput(input: string): string {
        return input
            .replace(/'/g, "''")  // Escape single quotes
            .replace(/\\/g, "\\\\")  // Escape backslashes
            .trim();
    }
}

export const queryValidator = new QueryValidator();
