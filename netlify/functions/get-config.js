// --- START OF FILE get-config.js (Refactored) ---

const pool = require('./database.js');
const { log, handleError } = require('./utils/logger.js'); // Import the utility

exports.handler = async function(event, context) {
    const functionName = 'get-config.js'; // Define function name for context

    try {
        const { id } = event.queryStringParameters || {};

        log('INFO', functionName, 'Handler invoked.', {
            httpMethod: event.httpMethod,
            id: id || 'N/A'
        });

        if (!id) {
            log('WARN', functionName, 'Bad Request: Missing configuration ID.');
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing configuration ID." }),
            };
        }

        const sql = `SELECT config_data FROM column_configurations WHERE id = $1;`;
        const result = await pool.query(sql, [id]);
        
        if (result.rows.length === 0) {
            log('INFO', functionName, `Configuration not found for id: ${id}`);
            // Return 404 Not Found, which is more accurate
            return {
                statusCode: 404,
                body: JSON.stringify({ error: `Configuration with id ${id} not found.` }),
            };
        }

        const config = result.rows[0].config_data || {};
        log('INFO', functionName, `Successfully fetched configuration for id: ${id}`);

        return {
            statusCode: 200,
            body: JSON.stringify(config),
        };

    } catch (error) {
        // Use the centralized error handler
        return handleError(error, functionName, event);
    }
};
// --- END OF FILE get-config.js (Refactored) ---
