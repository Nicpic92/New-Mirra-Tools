// --- START OF FILE team-report-configs.js ---

const pool = require('./database.js');

exports.handler = async function(event) {
    const { team_id, category_id } = event.queryStringParameters || {};

    try {
        switch (event.httpMethod) {
            case 'GET': {
                // If no params, get all configs. Otherwise, get for a specific team/category.
                if (!team_id || !category_id) {
                    const result = await pool.query('SELECT * FROM team_report_configurations;');
                    return { statusCode: 200, body: JSON.stringify(result.rows) };
                } else {
                    const sql = 'SELECT * FROM team_report_configurations WHERE team_id = $1 AND category_id = $2;';
                    const result = await pool.query(sql, [team_id, category_id]);
                    return { statusCode: 200, body: JSON.stringify(result.rows[0] || null) };
                }
            }
            case 'POST': { // Used for both creating and updating
                const { team_id, category_id, report_config_data } = JSON.parse(event.body);
                if (!team_id || !category_id || !report_config_data) {
                    return { statusCode: 400, body: 'Missing required parameters.' };
                }

                // Use INSERT ON CONFLICT (UPSERT) to handle both create and update in one command.
                const sql = `
                    INSERT INTO team_report_configurations (team_id, category_id, report_config_data, last_updated)
                    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                    ON CONFLICT (team_id, category_id)
                    DO UPDATE SET report_config_data = EXCLUDED.report_config_data, last_updated = CURRENT_TIMESTAMP
                    RETURNING *;
                `;

                const result = await pool.query(sql, [team_id, category_id, report_config_data]);
                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'DELETE': {
                const { id } = JSON.parse(event.body);
                if (!id) return { statusCode: 400, body: 'Missing configuration ID' };
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
