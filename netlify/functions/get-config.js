const { Pool } = require('pg');

exports.handler = async function(event, context) {
    // This function now requires an ID to fetch a specific configuration.
    const { id } = event.queryStringParameters || {};

    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing configuration ID." }),
        };
    }

    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });

        // The SQL is updated to fetch by ID instead of a hardcoded name.
        const sql = `SELECT config_data FROM column_configurations WHERE id = $1;`;
        
        const result = await pool.query(sql, [id]);
        await pool.end();

        // If no row is found, return an empty object, otherwise return the config data.
        const config = result.rows[0] ? result.rows[0].config_data : {};

        return {
            statusCode: 200,
            body: JSON.stringify(config),
        };

    } catch (error) {
        console.error("Error fetching configuration:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch configuration." }),
        };
    }
};
