require('dotenv').config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: 'yamanote.proxy.rlwy.net',
      port: 35067,
      user: 'postgres',
      password: 'oDzogKPrTrKDfIWTPpzATZihLCGtRRHo',
      database: 'railway',
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    }
  }
};
