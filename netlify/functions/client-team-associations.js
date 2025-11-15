// --- START OF FILE client-team-associations.js (Refactored) ---

const pool = require('./database.js');
const { log, handleError } = require('./utils/logger.js'); // Import the utility

exports.handler = async function(event) {
    const functionName = 'client-team-associations.js'; // Define function name for context
    const { config_id } = event.queryStringParameters || {};

    try {
        log('INFO', functionName, 'Handler invoked.', {
            httpMethod: event.httpMethod,
            config_id: config_id || 'N/A'
        });

        switch (event.httpMethod) {
            case 'GET': {
                if (!config_id) {
                    const result = await pool.query('SELECT config_id, team_id FROM client_team_associations;');
                    return { statusCode: 200, body: JSON.stringify(result.rows) };
                }
                const result = await pool.query('SELECT team_id FROM client_team_associations WHERE config_id = $1;', [config_id]);
                return { statusCode: 200, body: JSON.stringify(result.rows.map(r => r.team_id)) };
            }
            case 'POST': {
                const { config_id, team_ids } = JSON.parse(event.body);
                if (!config_id || !Array.isArray(team_ids)) {
                    log('WARN', functionName, 'Bad Request: Missing config_id or team_ids array.', { body: event.body });
                    return { statusCode: 400, body: 'Missing config_id or team_ids array' };
                }

                log('INFO', functionName, `Starting transaction for config_id: ${config_id}`, { teamCount: team_ids.length });

                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    log('INFO', functionName, `BEGIN transaction for config_id: ${config_id}`);

                    // First, delete all existing associations for this config_id
                    await client.query('DELETE FROM client_team_associations WHERE config_id = $1;', [config_id]);
                    log('INFO', functionName, `DELETED existing associations for config_id: ${config_id}`);
                    
                    // If there are new team_ids to associate, insert them.
                    if (team_ids.length > 0) {
                        const values = [];
                        const valuePlaceholders = team_ids.map((team_id, index) => {
                            const paramIndex = index * 2;
                            values.push(config_id, team_id);
                            return `($${paramIndex + 1}, $${paramIndex + 2})`;
                        }).join(',');

                        const sql = `INSERT INTO client_team_associations (config_id, team_id) VALUES ${valuePlaceholders};`;
                        await client.query(sql, values);
                        log('INFO', functionName, `INSERTED ${team_ids.length} new associations for config_id: ${config_id}`);
                    }

                    await client.query('COMMIT');
                    log('INFO', functionName, `COMMITTED transaction for config_id: ${config_id}`);

                } catch (e) {
                    await client.query('ROLLBACK');
                    log('ERROR', functionName, `Transaction ROLLED BACK for config_id: ${config_id}`, { errorMessage: e.message });
                    // We still rethrow the error to be caught by the main handler, which will log the full stack trace.
                    throw e;
                } finally {
                    client.release();
                }
                return { statusCode: 201, body: JSON.stringify({ message: 'Associations saved.' }) };
            }
            default:
                log('WARN', functionName, `Method Not Allowed: ${event.httpMethod}`);
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        // Use the centralized error handler for any uncaught exceptions
        return handleError(error, functionName, event);
    }
};
// --- END OF FILE client-team-associations.js (Refactored) ---
