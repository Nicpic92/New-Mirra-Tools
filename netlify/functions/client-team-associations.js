// --- START OF FILE client-team-associations.js ---

const pool = require('./database.js');

exports.handler = async function(event) {
    const { config_id } = event.queryStringParameters || {};

    try {
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
                    return { statusCode: 400, body: 'Missing config_id or team_ids array' };
                }

                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    // First, delete all existing associations for this config_id
                    await client.query('DELETE FROM client_team_associations WHERE config_id = $1;', [config_id]);
                    
                    // If there are new team_ids to associate, insert them.
                    if (team_ids.length > 0) {
                        // CORRECTED: Use a parameterized query to prevent SQL injection.
                        // We build a query with multiple value sets and pass all values in a single flat array.
                        const values = [];
                        const valuePlaceholders = team_ids.map((team_id, index) => {
                            const paramIndex = index * 2;
                            values.push(config_id, team_id);
                            return `($${paramIndex + 1}, $${paramIndex + 2})`;
                        }).join(',');

                        const sql = `INSERT INTO client_team_associations (config_id, team_id) VALUES ${valuePlaceholders};`;
                        await client.query(sql, values);
                    }

                    await client.query('COMMIT');
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                } finally {
                    client.release();
                }
                return { statusCode: 201, body: JSON.stringify({ message: 'Associations saved.' }) };
            }
            default:
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        console.error('Database error in client-team-associations.js:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
