import { drizzle } from "drizzle-orm/node-postgres";
import { sql, eq, desc, and } from "drizzle-orm";
import pg from "pg";
import * as schema from "../shared/schema";
import * as relations from "../shared/relations";

const { Pool } = pg;

// Database connection with Pooler optimization and SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace(':5432', ':6543') || "postgresql://127.0.0.1:5432/cognitive_erp",
  ssl: {
    rejectUnauthorized: false // Necessary for many cloud providers if they don't provide the cert
  },
  max: 10, // Limit connections for background stability
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Drizzle instance with schema and relations
export const db = drizzle(pool as any, { schema: { ...schema, ...relations } });

// Legacy storage interface (keeping for compatibility)
export interface IStorage {
  getUser(id: string): Promise<schema.User | undefined>;
  getUserByEmail(email: string): Promise<schema.User | undefined>;
  createUser(user: schema.InsertUser): Promise<schema.User>;

  // CPE Methods
  getProcesses(orgId: string): Promise<schema.Process[]>;
  createProcess(process: any): Promise<schema.Process>;
  getProcessInstances(processId: string): Promise<schema.ProcessInstance[]>;
  getProcessEvents(instanceId: string): Promise<any[]>;
  getRcaReports(instanceId: string): Promise<schema.RcaReport[]>;
  getRecentRcaReports(orgId: string): Promise<schema.RcaReport[]>;
  createProcessEvent(event: schema.InsertProcessEvent): Promise<schema.ProcessEvent>;

  // CRM Methods
  getCustomers(orgId: string): Promise<schema.Customer[]>;
  createCustomer(customer: schema.InsertCustomer): Promise<schema.Customer>;
  // HR Methods
  getEmployees(orgId: string): Promise<schema.Employee[]>;
  getEmployee(id: string): Promise<schema.Employee | undefined>;
  createEmployee(employee: schema.InsertEmployee): Promise<schema.Employee>;
  updateEmployeeStatus(id: string, updates: { currentArea?: string; currentStatus?: string }): Promise<schema.Employee>;
  updateEmployee(id: string, updates: Partial<schema.InsertEmployee>): Promise<schema.Employee>;
  deleteEmployee(id: string): Promise<void>;
  updateEmployeeEmbedding(id: string, embedding: number[]): Promise<schema.Employee>;
  findEmployeeByFace(embedding: number[], orgId: string): Promise<schema.Employee | undefined>;
  logWorkSession(session: any): Promise<any>;
  closeWorkSession(employeeId: string, endedAt?: Date): Promise<void>;
  getPayrollAdvances(orgId: string): Promise<schema.PayrollAdvance[]>;

  // Analytics Methods
  getAnalyticsMetrics(orgId: string): Promise<schema.AnalyticsMetric[]>;
  createAnalyticsMetric(metric: schema.InsertAnalyticsMetric): Promise<schema.AnalyticsMetric>;
  getMetricModels(orgId: string): Promise<schema.MetricModel[]>;
  updateMetricModel(id: string, updates: Partial<schema.InsertMetricModel>): Promise<schema.MetricModel | undefined>;
  getDailySalesStats(orgId: string): Promise<{ date: string; value: number; count: number }[]>;

  // Piecework
  getPieceworkTickets(orgId: string): Promise<any[]>;
  createPieceworkTicket(ticket: any): Promise<schema.PieceworkTicket>;

  // Payout Signature Flow
  createPendingPayout(token: string, data: any): void;
  getPendingPayout(token: string): any;
  consumePendingPayout(token: string): any;

  // Logistics/Cash
  getPendingDriverSettlements(orgId: string): Promise<any[]>;
}

export class DrizzleStorage implements IStorage {
  async getUser(id: string): Promise<schema.User | undefined> {
    return await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    return await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });
  }

  async createUser(insertUser: schema.InsertUser): Promise<schema.User> {
    const user = await db.insert(schema.users).values(insertUser as any).returning();
    return user as unknown as schema.User;
  }

  async getProcesses(orgId: string): Promise<schema.Process[]> {
    return await db.query.processes.findMany({
      where: (processes, { eq }) => eq(processes.organizationId, orgId),
      orderBy: (processes, { asc }) => [asc(processes.orderIndex)],
    });
  }

  async createProcess(process: typeof schema.processes.$inferInsert): Promise<schema.Process> {
    const [newProcess] = await db.insert(schema.processes).values(process).returning();
    return newProcess;
  }

  async getProcessInstances(processId: string): Promise<schema.ProcessInstance[]> {
    return await db.query.processInstances.findMany({
      where: (instances, { eq }) => eq(instances.processId, processId),
      orderBy: (instances, { desc }) => [desc(instances.startedAt)],
    });
  }

  async getProcessEvents(instanceId: string): Promise<any[]> {
    const events = await db.select({
      id: schema.processEvents.id,
      instanceId: schema.processEvents.instanceId,
      stepId: schema.processEvents.stepId,
      eventType: schema.processEvents.eventType,
      data: schema.processEvents.data,
      timestamp: schema.processEvents.timestamp,
      stepName: schema.processSteps.name,
    })
      .from(schema.processEvents)
      .leftJoin(schema.processSteps, sql`${schema.processEvents.stepId} = ${schema.processSteps.id}`)
      .where(sql`${schema.processEvents.instanceId} = ${instanceId}`)
      .orderBy(sql`${schema.processEvents.timestamp} asc`);

    return events;
  }

  async getRcaReports(instanceId: string): Promise<schema.RcaReport[]> {
    return await db.query.rcaReports.findMany({
      where: (reports, { eq }) => eq(reports.instanceId, instanceId),
    });
  }

  async getRecentRcaReports(orgId: string): Promise<schema.RcaReport[]> {
    return db
      .select({
        id: schema.rcaReports.id,
        instanceId: schema.rcaReports.instanceId,
        targetEventId: schema.rcaReports.targetEventId,
        rootCauseEventId: schema.rcaReports.rootCauseEventId,
        confidence: schema.rcaReports.confidence,
        analysis: schema.rcaReports.analysis,
        recommendation: schema.rcaReports.recommendation,
        status: schema.rcaReports.status,
        createdAt: schema.rcaReports.createdAt,
      })
      .from(schema.rcaReports)
      .innerJoin(schema.processInstances, eq(schema.rcaReports.instanceId, schema.processInstances.id))
      .innerJoin(schema.processes, eq(schema.processInstances.processId, schema.processes.id))
      .where(eq(schema.processes.organizationId, orgId))
      .orderBy(desc(schema.rcaReports.createdAt))
      .limit(5);
  }

  async createProcessEvent(insertEvent: schema.InsertProcessEvent): Promise<schema.ProcessEvent> {
    const [event] = await db.insert(schema.processEvents).values(insertEvent).returning();
    return event;
  }

  // CRM Methods
  async getCustomers(orgId: string): Promise<schema.Customer[]> {
    return await db.query.customers.findMany({
      where: (customers, { eq, and }) => and(
        eq(customers.organizationId, orgId),
        eq(customers.isArchived, false)
      ),
      orderBy: (customers, { desc }) => [desc(customers.createdAt)],
    });
  }

  async createCustomer(customer: schema.InsertCustomer): Promise<schema.Customer> {
    const [newCustomer] = await db.insert(schema.customers).values(customer).returning();
    return newCustomer;
  }

  async getSuppliers(orgId: string): Promise<schema.Supplier[]> {
    return await db.query.suppliers.findMany({
      where: (suppliers, { eq, and }) => and(
        eq(suppliers.organizationId, orgId),
        eq(suppliers.isArchived, false)
      ),
      orderBy: (suppliers, { desc }) => [desc(suppliers.createdAt)],
    });
  }

  async createSupplier(supplier: schema.InsertSupplier): Promise<schema.Supplier> {
    const [newSupplier] = await db.insert(schema.suppliers).values(supplier).returning();
    return newSupplier;
  }

  async getEmployees(orgId: string): Promise<schema.Employee[]> {
    return await db.select().from(schema.employees).where(and(
      eq(schema.employees.organizationId, orgId),
      eq(schema.employees.isArchived, false)
    ));
  }

  async createEmployee(employee: schema.InsertEmployee): Promise<schema.Employee> {
    const [newEmployee] = await db.insert(schema.employees).values(employee).returning();
    return newEmployee;
  }

  async getEmployee(id: string): Promise<schema.Employee | undefined> {
    const [employee] = await db.select().from(schema.employees).where(eq(schema.employees.id, id));
    return employee;
  }

  // T-CAC Methods
  async updateEmployeeStatus(id: string, updates: { currentArea?: string; currentStatus?: string }): Promise<schema.Employee> {
    const [updated] = await db
      .update(schema.employees)
      .set(updates)
      .where(eq(schema.employees.id, id))
      .returning();
    return updated;
  }

  async updateEmployee(id: string, updates: Partial<schema.InsertEmployee>): Promise<schema.Employee> {
    const [updated] = await db
      .update(schema.employees)
      .set(updates)
      .where(eq(schema.employees.id, id))
      .returning();
    return updated;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.delete(schema.employees).where(eq(schema.employees.id, id));
  }

  async updateEmployeeEmbedding(id: string, embedding: number[]): Promise<schema.Employee> {
    // @ts-ignore
    const [updated] = await db
      .update(schema.employees)
      .set({ faceEmbedding: embedding })
      .where(eq(schema.employees.id, id))
      .returning();
    return updated;
  }

  async findEmployeeByFace(embedding: number[], orgId: string): Promise<schema.Employee | undefined> {
    const vectorLiteral = `[${embedding.join(",")}]`;
    // We use a threshold of 0.6 for Face Recognition distance.
    // Anything above 0.6 is considered a non-match.
    const [match] = await db
      .select()
      .from(schema.employees)
      .where(and(
        eq(schema.employees.organizationId, orgId),
        sql`${schema.employees.faceEmbedding} <-> ${vectorLiteral} <= 0.6`
      ))
      .orderBy(sql`${schema.employees.faceEmbedding} <-> ${vectorLiteral}`)
      .limit(1);

    return match;
  }

  async logWorkSession(session: any): Promise<any> {
    return await db.insert(schema.workSessions).values(session).returning();
  }

  async closeWorkSession(employeeId: string, endedAt: Date = new Date()): Promise<void> {
    await db.update(schema.workSessions)
      .set({ status: 'completed', endedAt: endedAt })
      .where(and(
        eq(schema.workSessions.employeeId, employeeId),
        eq(schema.workSessions.status, 'active')
      ));
  }

  async getPayrollAdvances(orgId: string): Promise<schema.PayrollAdvance[]> {
    return await db.select().from(schema.payrollAdvances).where(eq(schema.payrollAdvances.organizationId, orgId));
  }

  async getPieceworkTickets(orgId: string): Promise<any[]> {
    return await db.query.pieceworkTickets.findMany({
      where: (tickets, { eq }) => eq(tickets.organizationId, orgId),
      orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
    });
  }

  async createPieceworkTicket(ticket: any): Promise<schema.PieceworkTicket> {
    const [newTicket] = await db.insert(schema.pieceworkTickets).values(ticket).returning();
    return newTicket;
  }

  // Analytics Methods
  async getAnalyticsMetrics(orgId: string): Promise<schema.AnalyticsMetric[]> {
    return await db.query.analyticsMetrics.findMany({
      where: (metrics, { eq }) => eq(metrics.organizationId, orgId),
      orderBy: (metrics, { desc }) => [desc(metrics.date)],
      limit: 100, // Reasonable limit for dashboard
    });
  }

  async createAnalyticsMetric(metric: schema.InsertAnalyticsMetric): Promise<schema.AnalyticsMetric> {
    const [newMetric] = await db.insert(schema.analyticsMetrics).values(metric).returning();
    return newMetric;
  }

  async getMetricModels(orgId: string): Promise<schema.MetricModel[]> {
    return await db.query.metricModels.findMany({
      where: (models, { eq }) => eq(models.organizationId, orgId),
    });
  }

  async updateMetricModel(id: string, updates: Partial<schema.InsertMetricModel>): Promise<schema.MetricModel | undefined> {
    const [updated] = await db
      .update(schema.metricModels)
      .set({ ...updates, lastTrainedAt: new Date() })
      .where(eq(schema.metricModels.id, id))
      .returning();
    return updated;
  }

  async getDailySalesStats(orgId: string): Promise<{ date: string; value: number; count: number }[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Group sales by day
    const salesData = await db
      .select({
        date: sql`DATE(${schema.sales.date})`.mapWith(String),
        value: sql<number>`SUM(${schema.sales.totalPrice})`.mapWith(Number),
        count: sql<number>`COUNT(${schema.sales.id})`.mapWith(Number),
      })
      .from(schema.sales)
      .where(
        sql`${schema.sales.organizationId} = ${orgId} AND ${schema.sales.date} >= ${sevenDaysAgo}`
      )
      .groupBy(sql`DATE(${schema.sales.date})`)
      .orderBy(sql`DATE(${schema.sales.date})`);

    return salesData.map(item => ({
      date: item.date,
      value: item.value || 0,
      count: item.count || 0
    }));
  }

  // Payout Signature Flow Persistence
  private pendingPayouts = new Map<string, any>();

  createPendingPayout(token: string, data: any): void {
    this.pendingPayouts.set(token, { ...data, createdAt: Date.now() });
    // Auto-expire after 30 mins
    setTimeout(() => this.pendingPayouts.delete(token), 30 * 60 * 1000);
  }

  getPendingPayout(token: string): any {
    return this.pendingPayouts.get(token);
  }

  consumePendingPayout(token: string): any {
    const data = this.pendingPayouts.get(token);
    this.pendingPayouts.delete(token);
    return data;
  }

  async getPendingDriverSettlements(orgId: string): Promise<any[]> {
    // Sales where paymentMethod is cash, paymentStatus is paid, but no cashTransaction links to it
    // referenceId in cashTransactions would match sales.id
    const settlements = await db.select({
      saleId: schema.sales.id,
      amount: schema.sales.totalPrice,
      date: schema.sales.date,
      driverId: schema.sales.driverId,
      driverName: schema.employees.name
    })
      .from(schema.sales)
      .leftJoin(schema.employees, eq(schema.sales.driverId, schema.employees.id))
      .where(and(
        eq(schema.sales.organizationId, orgId),
        eq(schema.sales.paymentMethod, 'cash'),
        eq(schema.sales.paymentStatus, 'paid'),
        sql`NOT EXISTS (
          SELECT 1 FROM ${schema.cashTransactions} 
          WHERE ${schema.cashTransactions.referenceId} = ${schema.sales.id}
        )`
      ));
    return settlements;
  }
}

export const storage = new DrizzleStorage();

