const { Pool } = require('pg');

exports.handler = async function(event, context) {
    try {
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });

        const sql = `SELECT config_data FROM column_configurations WHERE config_name = 'default_report';`;
        
        const result = await pool.query(sql);
        await pool.end();

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
