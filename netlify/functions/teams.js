// --- START OF FILE teams.js (Refactored) ---

const pool = require('./database.js');
// Import the new logging and error handling utility
const {
    log,
    handleError
} = require('./utils/logger.js');

exports.handler = async function(event) {
    // Define the function name for consistent, contextual logging
    const functionName = 'teams.js';

    try {
        const {
            id
        } = event.queryStringParameters || {};

        // Log the invocation of the function for better traceability
        log('INFO', functionName, 'Handler invoked.', {
            httpMethod: event.httpMethod,
            id: id || 'N/A'
        });

        switch (event.httpMethod) {
            case 'GET':
                {
                    const result = await pool.query('SELECT * FROM teams ORDER BY team_name;');
                    return {
                        statusCode: 200,
                        body: JSON.stringify(result.rows)
                    };
                }
            case 'POST':
                {
                    const {
                        team_name
                    } = JSON.parse(event.body);
                    if (!team_name) {
                        log('WARN', functionName, 'Bad Request: Missing team_name.', {
                            body: event.body
                        });
                        return {
                            statusCode: 400,
                            body: 'Missing team_name'
                        };
                    }
                    const sql = 'INSERT INTO teams (team_name) VALUES ($1) RETURNING *;';
                    const result = await pool.query(sql, [team_name]);
                    log('INFO', functionName, `Team created: ${result.rows[0].id}`, {
                        teamName: team_name
                    });
                    return {
                        statusCode: 201,
                        body: JSON.stringify(result.rows[0])
                    };
                }
            case 'DELETE':
                {
                    if (!id) {
                        log('WARN', functionName, 'Bad Request: Missing team ID for DELETE.');
                        return {
                            statusCode: 400,
                            body: 'Missing team ID'
                        };
                    }
                    await pool.query('DELETE FROM teams WHERE id = $1;', [id]);
                    log('INFO', functionName, `Team deleted: ${id}`);
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            message: 'Team deleted'
                        })
                    };
                }
            default:
                log('WARN', functionName, `Method Not Allowed: ${event.httpMethod}`);
                return {
                    statusCode: 405,
                    body: 'Method Not Allowed'
                };
        }
    } catch (error) {
        // All errors are now caught and handled by our centralized utility
        return handleError(error, functionName, event);
    }
};
// --- END OF FILE teams.js (Refactored) ---
