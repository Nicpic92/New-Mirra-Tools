// --- START OF FILE save-config.js (Refactored) ---

const pool = require('./database.js');
const { log, handleError } = require('./utils/logger.js'); // Import the utility

exports.handler = async function(event, context) {
    const functionName = 'save-config.js'; // Define function name for context

    try {
        log('INFO', functionName, 'Handler invoked.', { httpMethod: event.httpMethod });

        if (event.httpMethod !== 'PUT') {
            log('WARN', functionName, `Method Not Allowed: ${event.httpMethod}`);
            return { statusCode: 405, body: 'Method Not Allowed' };
        }

        const { id } = event.queryStringParameters || {};
        
        if (!id) {
            log('WARN', functionName, 'Bad Request: Missing configuration ID.');
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing configuration ID." }),
            };
        }

        const configData = JSON.parse(event.body);

        const sql = `
            UPDATE column_configurations
            SET config_data = $1, last_updated = CURRENT_TIMESTAMP
            WHERE id = $2;
        `;
        
        await pool.query(sql, [configData, id]);

        log('INFO', functionName, `Successfully saved configuration for id: ${id}`);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Configuration saved successfully!" }),
        };

    } catch (error) {
        // Use the centralized error handler
        return handleError(error, functionName, event);
    }
};
// --- END OF FILE save-config.js (Refactored) ---
