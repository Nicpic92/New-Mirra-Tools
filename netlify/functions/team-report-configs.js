// --- START OF FILE team-report-configs.js (Refactored) ---

const pool = require('./database.js');
const { log, handleError } = require('./utils/logger.js'); // Import the utility

exports.handler = async function(event) {
    const functionName = 'team-report-configs.js'; // Define function name for context

    try {
        const { id } = event.queryStringParameters || {};

        log('INFO', functionName, 'Handler invoked.', {
            httpMethod: event.httpMethod,
            id: id || 'N/A'
        });

        switch (event.httpMethod) {
            case 'GET': {
                const result = await pool.query('SELECT * FROM team_report_configurations ORDER BY team_id, category_id;');
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const { team_id, category_id, report_config_data } = JSON.parse(event.body);
                if (!team_id || !category_id || !report_config_data) {
                    log('WARN', functionName, 'Bad Request: Missing required parameters for POST.', { body: event.body });
                    return { statusCode: 400, body: 'Missing required parameters.' };
                }
                const sql = `
                    INSERT INTO team_report_configurations (team_id, category_id, report_config_data)
                    VALUES ($1, $2, $3)
                    RETURNING *;
                `;
                const result = await pool.query(sql, [team_id, category_id, report_config_data]);
                log('INFO', functionName, `Team report config CREATED: id ${result.rows[0].id}`, { team_id, category_id });
                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'PUT': {
                 if (!id) {
                    log('WARN', functionName, 'Bad Request: Missing configuration ID in query string for PUT.');
                    return { statusCode: 400, body: 'Missing configuration ID in query string for update.' };
                 }
                 
                 const { team_id, category_id, report_config_data } = JSON.parse(event.body);
                 if (!team_id || !category_id || !report_config_data) {
                    log('WARN', functionName, 'Bad Request: Missing required parameters in body for PUT.', { id, body: event.body });
                    return { statusCode: 400, body: 'Missing required parameters in body for update.' };
                }
                const sql = `
                    UPDATE team_report_configurations 
                    SET team_id = $1, category_id = $2, report_config_data = $3, last_updated = CURRENT_TIMESTAMP
                    WHERE id = $4
                    RETURNING *;
                `;
                 const result = await pool.query(sql, [team_id, category_id, report_config_data, id]);
                 log('INFO', functionName, `Team report config UPDATED: id ${id}`, { team_id, category_id });
                return { statusCode: 200, body: JSON.stringify(result.rows[0]) };
            }
            case 'DELETE': {
                if (!id) {
                    log('WARN', functionName, 'Bad Request: Missing configuration ID in query string for DELETE.');
                    return { statusCode: 400, body: 'Missing configuration ID in query string' };
                }
                await pool.query('DELETE FROM team_report_configurations WHERE id = $1;', [id]);
                log('INFO', functionName, `Team report config DELETED: id ${id}`);
                return { statusCode: 200, body: JSON.stringify({ message: 'Report configuration deleted' }) };
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
// --- END OF FILE team-report-configs.js (Refactored) ---
