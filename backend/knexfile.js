require("dotenv").config();

const DEFAULT_REMOTE_DB_URL =
  "postgresql://postgres:yDKELokUDEzzoeMtKvcMBqRgHoesRrsK@turntable.proxy.rlwy.net:57197/railway";

// Local default points to the restored offline copy
const DEFAULT_LOCAL_DB_URL =
  "postgresql://postgres@localhost:5432/railway_offline";

// Helper to decide which connection string to use in development
function resolveDevConnectionString() {
  // Priority order:
  // 1) Explicit LOCAL_DB_URL when OFFLINE=true
  // 2) Build from individual LOCAL_DB_* vars when OFFLINE=true
  // 3) DATABASE_URL (Railway or custom)
  // 4) DEFAULT_REMOTE_DB_URL
  const isOffline = String(process.env.OFFLINE).toLowerCase() === "true";

  if (isOffline) {
    if (process.env.LOCAL_DB_URL) return process.env.LOCAL_DB_URL;

    const host = process.env.LOCAL_DB_HOST || "localhost";
    const port = process.env.LOCAL_DB_PORT || "5432";
    const name = process.env.LOCAL_DB_NAME || "railway_offline";
    const user = process.env.LOCAL_DB_USER || "postgres";
    const password = process.env.LOCAL_DB_PASSWORD || "";
    const auth = password ? `${user}:${password}` : user;
    return `postgresql://${auth}@${host}:${port}/${name}`;
  }

  return process.env.DATABASE_URL || DEFAULT_REMOTE_DB_URL;
}

module.exports = {
  development: {
    client: "postgresql",
    // Use Railway database by default, local if DATABASE_URL is set to local
    connection: (() => {
      const url = resolveDevConnectionString();
      const useSSL = /^(?!.*127\.0\.0\.1)(?!.*localhost)/i.test(url);
      return {
        connectionString: url,
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      };
    })(),
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
    },
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
    },
  },

  staging: {
    client: "postgresql",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
    },
  },

  production: {
    client: "postgresql",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations",
    },
  },
};
