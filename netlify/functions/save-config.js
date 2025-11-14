// --- START OF FILE save-config.js ---

const pool = require('./database.js'); // THE FIX: Use the shared pool

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'PUT') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { id } = event.queryStringParameters || {};
    
    if (!id) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing configuration ID." }),
        };
    }

    try {
        const configData = JSON.parse(event.body);

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
        console.error("Error in save-config.js:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to save configuration." }),
        };
    }
};
