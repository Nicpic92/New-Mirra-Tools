// Import the Node.js Postgres client
const { Pool } = require('pg');

exports.handler = async function(event, context) {
    // We only accept POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const configData = JSON.parse(event.body);

        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });

        const sql = `
            UPDATE column_configurations
            SET config_data = $1, last_updated = CURRENT_TIMESTAMP
            WHERE config_name = 'default_report';
        `;
        
        await pool.query(sql, [configData]);
        await pool.end();

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
