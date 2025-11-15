// --- START OF FILE categories.js (Refactored) ---

const pool = require('./database.js');
const { log, handleError } = require('./utils/logger.js'); // Import the utility

exports.handler = async function(event) {
    const functionName = 'categories.js'; // Define function name for context

    try {
        const { id } = event.queryStringParameters || {};

        log('INFO', functionName, 'Handler invoked.', {
            httpMethod: event.httpMethod,
            id: id || 'N/A'
        });

        switch (event.httpMethod) {
            case 'GET': {
                const sql = `
                    SELECT c.id, c.category_name, c.team_id, t.team_name, c.send_to_l1_monitor
                    FROM claim_categories c
                    LEFT JOIN teams t ON c.team_id = t.id
                    ORDER BY t.team_name, c.category_name;
                `;
                const result = await pool.query(sql);
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const { category_name, team_id, send_to_l1_monitor } = JSON.parse(event.body);
                if (!category_name || !team_id) {
                    log('WARN', functionName, 'Bad Request: Missing category_name or team_id.', { body: event.body });
                    return { statusCode: 400, body: 'Missing category_name or team_id' };
                }
                const sql = 'INSERT INTO claim_categories (category_name, team_id, send_to_l1_monitor) VALUES ($1, $2, $3) RETURNING *;';
                const result = await pool.query(sql, [category_name, team_id, send_to_l1_monitor || false]);
                
                log('INFO', functionName, `Category created: ${result.rows[0].id}`, {
                    categoryName: category_name,
                    teamId: team_id
                });
                
                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'DELETE': {
                if (!id) {
                    log('WARN', functionName, 'Bad Request: Missing category ID for DELETE.');
                    return { statusCode: 400, body: 'Missing category ID' };
                }
                await pool.query('DELETE FROM claim_categories WHERE id = $1;', [id]);
                log('INFO', functionName, `Category deleted: ${id}`);
                return { statusCode: 200, body: JSON.stringify({ message: 'Category deleted' }) };
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
// --- END OF FILE categories.js (Refactored) ---
