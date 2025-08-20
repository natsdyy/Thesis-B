require("dotenv").config();

const DEFAULT_LOCAL_DB_URL =
  "postgres://postgres:password@127.0.0.1:5432/railway";

module.exports = {
  development: {
    client: "postgresql",
    // Prefer DATABASE_URL if provided, else default to local docker db
    connection: (() => {
      const url = process.env.DATABASE_URL || DEFAULT_LOCAL_DB_URL;
      const useSSL = /^(?!.*127\.0\.0\.1)(?!.*localhost)/i.test(url);
      return {
        connectionString: url,
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      };
    })(),
    pool: {
      min: 2,
      max: 10,
      // Timeouts to avoid hanging connections and reduce transient failures
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
