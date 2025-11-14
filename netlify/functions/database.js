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
  global.dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Sensible defaults for a serverless environment
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Fail if a connection cannot be made within 10 seconds
  });
}

// Export the existing or newly created pool for other functions to use.
module.exports = global.dbPool;
