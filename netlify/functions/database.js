// --- START OF FILE database.js ---

const { Pool } = require('pg');

/**
 * This is a "singleton" pattern for a database connection pool in a serverless environment.
 * It checks if a global pool object already exists. If not, it creates one.
 * This ensures that for any "warm" serverless instance, we reuse the same connection pool,
 * which is much more efficient than creating a new one for every single request.
 */
if (!global.dbPool) {
  console.log("Creating NEW SHARED database connection pool.");
  
  // Check if the DATABASE_URL is even present.
  if (!process.env.DATABASE_URL) {
    throw new Error("FATAL: DATABASE_URL environment variable is not set.");
  }

  global.dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,

    // Add SSL configuration. Most cloud databases require this.
    // This tells the client to connect via SSL but not to fail if the
    // certificate isn't from a recognized authority, which is standard
    // for many managed database services.
    ssl: {
      rejectUnauthorized: false
    },

    // Sensible defaults for a serverless environment
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Fail if a connection cannot be made within 10 seconds
  });
}

// Export the existing or newly created pool for other functions to use.
module.exports = global.dbPool;
