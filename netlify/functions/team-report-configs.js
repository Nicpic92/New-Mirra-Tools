// --- START OF FILE team-report-configs.js ---

const pool = require('./database.js');

exports.handler = async function(event) {
    const { id, team_id, category_id } = event.queryStringParameters || {};

    try {
        switch (event.httpMethod) {
            case 'GET': {
                // If no params, get all configs.
                const result = await pool.query('SELECT * FROM team_report_configurations ORDER BY team_id, category_id;');
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const { team_id, category_id, report_config_data } = JSON.parse(event.body);
                if (!team_id || !category_id || !report_config_data) {
                    return { statusCode: 400, body: 'Missing required parameters.' };
                }
                const sql = `
                    INSERT INTO team_report_configurations (team_id, category_id, report_config_data)
                    VALUES ($1, $2, $3)
                    RETURNING *;
                `;
                const result = await pool.query(sql, [team_id, category_id, report_config_data]);
                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'PUT': {
                 // The 'id' for the WHERE clause comes from the query string
                 if (!id) return { statusCode: 400, body: 'Missing configuration ID in query string for update.' };
                 
                 const { team_id, category_id, report_config_data } = JSON.parse(event.body);
                 if (!team_id || !category_id || !report_config_data) {
                    return { statusCode: 400, body: 'Missing required parameters in body for update.' };
                }
                const sql = `
                    UPDATE team_report_configurations 
                    SET team_id = $1, category_id = $2, report_config_data = $3, last_updated = CURRENT_TIMESTAMP
                    WHERE id = $4
                    RETURNING *;
                `;
                 const result = await pool.query(sql, [team_id, category_id, report_config_data, id]);
                return { statusCode: 200, body: JSON.stringify(result.rows[0]) };
            }
            case 'DELETE': {
                if (!id) return { statusCode: 400, body: 'Missing configuration ID in query string' };
                await pool.query('DELETE FROM team_report_configurations WHERE id = $1;', [id]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Report configuration deleted' }) };
            }
            default:
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        console.error('Database error in team-report-configs.js:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
