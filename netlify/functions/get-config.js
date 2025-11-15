// --- START OF FILE get-config.js ---

const pool = require('./database.js');

exports.handler = async function(event, context) {
    const { id } = event.queryStringParameters || {};

    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing configuration ID." }),
        };
    }

    try {
        const sql = `SELECT config_data FROM column_configurations WHERE id = $1;`;
        const result = await pool.query(sql, [id]);
        const config = result.rows[0] ? result.rows[0].config_data : {};

        return {
            statusCode: 200,
            body: JSON.stringify(config),
        };

    } catch (error) {
        console.error("Error fetching configuration in get-config.js:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch configuration." }),
        };
    }
};
