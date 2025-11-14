// Import the Node.js Postgres client
const { Pool } = require('pg');

// Create the connection pool ONCE, outside the handler
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

exports.handler = async function(event, context) {
    // We now accept PUT requests for updating a specific resource.
    if (event.httpMethod !== 'PUT') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // This function now requires an ID to update a specific configuration.
    const { id } = event.queryStringParameters || {};
    
    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing configuration ID." }),
        };
    }

    try {
        // The body of a PUT request should be the config_data object directly
        const configData = JSON.parse(event.body);

        // The SQL is updated to update by ID instead of a hardcoded name.
        const sql = `
            UPDATE column_configurations
            SET config_data = $1, last_updated = CURRENT_TIMESTAMP
            WHERE id = $2;
        `;
        
        await pool.query(sql, [configData, id]);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Configuration saved successfully!" }),
        };

    } catch (error) {
        console.error("Error saving configuration:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to save configuration." }),
        };
    }
};
