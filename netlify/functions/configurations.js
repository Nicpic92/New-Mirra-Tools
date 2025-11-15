// --- START OF FILE configurations.js (Refactored) ---

const pool = require('./database.js');
const { log, handleError } = require('./utils/logger.js'); // Import the utility

exports.handler = async function(event) {
    const functionName = 'configurations.js'; // Define function name for context

    try {
        const { id } = event.queryStringParameters || {};

        log('INFO', functionName, 'Handler invoked.', {
            httpMethod: event.httpMethod,
            id: id || 'N/A'
        });

        switch (event.httpMethod) {
            case 'GET': {
                const result = await pool.query('SELECT id, config_name, config_data FROM column_configurations ORDER BY config_name;');
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const { config_name, config_data } = JSON.parse(event.body);
                if (!config_name || !config_data) {
                    log('WARN', functionName, 'Bad Request: Missing config_name or config_data.', { body: event.body });
                    return { statusCode: 400, body: 'Missing config_name or config_data' };
                }
                const sql = 'INSERT INTO column_configurations (config_name, config_data) VALUES ($1, $2) RETURNING id;';
                const result = await pool.query(sql, [config_name, config_data]);
                
                log('INFO', functionName, `Configuration created: ${result.rows[0].id}`, { configName: config_name });

                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'PUT': {
                if (!id) {
                    log('WARN', functionName, 'Bad Request: Missing configuration ID for PUT.');
                    return { statusCode: 400, body: 'Missing configuration ID' };
                }
                const { config_name, config_data } = JSON.parse(event.body);
                const sql = 'UPDATE column_configurations SET config_name = $1, config_data = $2, last_updated = CURRENT_TIMESTAMP WHERE id = $3;';
                await pool.query(sql, [config_name, config_data, id]);

                log('INFO', functionName, `Configuration updated: ${id}`, { configName: config_name });

                return { statusCode: 200, body: JSON.stringify({ message: 'Configuration updated' }) };
            }
            case 'DELETE': {
                if (!id) {
                    log('WARN', functionName, 'Bad Request: Missing configuration ID for DELETE.');
                    return { statusCode: 400, body: 'Missing configuration ID' };
                }
                await pool.query('DELETE FROM column_configurations WHERE id = $1;', [id]);
                log('INFO', functionName, `Configuration deleted: ${id}`);
                return { statusCode: 200, body: JSON.stringify({ message: 'Configuration deleted' }) };
            }
            default:
                log('WARN', functionName, `Method Not Allowed: ${event.httpMethod}`);
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        // Use the centralized error handler
        return handleError(error, functionName, event);
    }
};
// --- END OF FILE configurations.js (Refactored) ---
