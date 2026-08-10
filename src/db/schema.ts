import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  pgEnum,
  serial,
  varchar,
  index,
} from "drizzle-orm/pg-core";

// Enums
export const roleEnum = pgEnum("role", ["USER", "RESELLER", "ADMIN"]);
export const serverStatusEnum = pgEnum("server_status", [
  "STARTING",
  "RUNNING",
  "STOPPING",
  "STOPPED",
  "CRASHED",
  "ERROR",
  "SUSPENDED",
]);
export const nodeStatusEnum = pgEnum("node_status", [
  "ONLINE",
  "OFFLINE",
  "MAINTENANCE",
]);
export const apiKeyStatusEnum = pgEnum("api_key_status", [
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
]);
export const restartPolicyEnum = pgEnum("restart_policy", [
  "OFF",
  "ON_FAILURE",
  "ALWAYS",
]);
export const auditActionEnum = pgEnum("audit_action", [
  "LOGIN",
  "LOGOUT",
  "CREATE",
  "UPDATE",
  "DELETE",
  "START",
  "STOP",
  "RESTART",
  "KILL",
  "SUSPEND",
  "UNSUSPEND",
  "API_REQUEST",
  "API_KEY_CREATE",
  "API_KEY_REVOKE",
  "API_KEY_ROTATE",
  "API_KEY_DELETE",
]);

// Users
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("USER"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  resellerId: text("reseller_id"),
  suspended: boolean("suspended").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Sessions
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

// Nodes
export const nodes = pgTable("nodes", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  fqdn: varchar("fqdn", { length: 255 }).notNull(),
  port: integer("port").notNull().default(8080),
  status: nodeStatusEnum("status").notNull().default("ONLINE"),
  totalRamMb: integer("total_ram_mb").notNull().default(8192),
  totalCpuPercent: integer("total_cpu_percent").notNull().default(400),
  totalStorageMb: integer("total_storage_mb").notNull().default(102400),
  usedRamMb: integer("used_ram_mb").notNull().default(0),
  usedCpuPercent: integer("used_cpu_percent").notNull().default(0),
  usedStorageMb: integer("used_storage_mb").notNull().default(0),
  dockerSocket: text("docker_socket").default("/var/run/docker.sock"),
  authToken: text("auth_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Ports
export const ports = pgTable("ports", {
  id: serial("id").primaryKey(),
  nodeId: text("node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  port: integer("port").notNull(),
  serverId: text("server_id"),
  allocated: boolean("allocated").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Servers
export const servers = pgTable("servers", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nodeId: text("node_id")
    .notNull()
    .references(() => nodes.id),
  status: serverStatusEnum("status").notNull().default("STOPPED"),
  containerId: text("container_id"),
  dockerImage: text("docker_image").notNull().default("node:20-alpine"),
  nodeVersion: varchar("node_version", { length: 10 }).notNull().default("20"),
  startupCommand: text("startup_command").notNull().default('if [ -d .git ] && [ "${AUTO_UPDATE}" = "1" ]; then git pull; fi; if [ -n "${NODE_PACKAGES}" ]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [ -n "${UNNODE_PACKAGES}" ]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/node /home/container/${MAIN_FILE}'),
  ramMb: integer("ram_mb").notNull().default(1024),
  cpuPercent: integer("cpu_percent").notNull().default(100),
  storageMb: integer("storage_mb").notNull().default(5120),
  allocatedPort: integer("allocated_port"),
  restartPolicy: restartPolicyEnum("restart_policy").notNull().default("OFF"),
  maxRestarts: integer("max_restarts").notNull().default(3),
  restartDelay: integer("restart_delay").notNull().default(5),
  suspended: boolean("suspended").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Server Environment
export const serverEnvironment = pgTable("server_environment", {
  id: serial("id").primaryKey(),
  serverId: text("server_id")
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Server Logs
export const serverLogs = pgTable(
  "server_logs",
  {
    id: serial("id").primaryKey(),
    serverId: text("server_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    level: varchar("level", { length: 20 }).notNull().default("info"),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("server_logs_server_id_idx").on(t.serverId)]
);

// Backups
export const backups = pgTable("backups", {
  id: text("id").primaryKey(),
  serverId: text("server_id")
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  sizeMb: integer("size_mb").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Reseller Quotas
export const resellerQuotas = pgTable("reseller_quotas", {
  id: serial("id").primaryKey(),
  resellerId: text("reseller_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  maxUsers: integer("max_users").notNull().default(10),
  maxServers: integer("max_servers").notNull().default(20),
  maxRamMb: integer("max_ram_mb").notNull().default(10240),
  maxCpuPercent: integer("max_cpu_percent").notNull().default(200),
  maxStorageMb: integer("max_storage_mb").notNull().default(51200),
  usedUsers: integer("used_users").notNull().default(0),
  usedServers: integer("used_servers").notNull().default(0),
  usedRamMb: integer("used_ram_mb").notNull().default(0),
  usedCpuPercent: integer("used_cpu_percent").notNull().default(0),
  usedStorageMb: integer("used_storage_mb").notNull().default(0),
});

// API Keys
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  prefix: varchar("prefix", { length: 20 }).notNull(),
  keyHash: text("key_hash").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  status: apiKeyStatusEnum("status").notNull().default("ACTIVE"),
  rateLimitPerMinute: integer("rate_limit_per_minute").notNull().default(60),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
});

// API Key Rate Limit Tracking (in-memory in practice, but stored for audit)
export const apiKeyUsage = pgTable("api_key_usage", {
  id: serial("id").primaryKey(),
  apiKeyId: text("api_key_id")
    .notNull()
    .references(() => apiKeys.id, { onDelete: "cascade" }),
  requests: integer("requests").notNull().default(0),
  windowStart: timestamp("window_start").notNull().defaultNow(),
});

// Audit Logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id"),
    apiKeyId: text("api_key_id"),
    action: text("action").notNull(),
    resource: text("resource"),
    resourceId: text("resource_id"),
    endpoint: text("endpoint"),
    method: varchar("method", { length: 10 }),
    statusCode: integer("status_code"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_at_idx").on(t.createdAt)]
);
