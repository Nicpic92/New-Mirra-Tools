// --- START OF FILE client-team-associations.js ---

const { Pool } = require('pg');

// Create the connection pool ONCE, outside the handler
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

                // Use a client from the pool for transactions
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    await client.query('DELETE FROM client_team_associations WHERE config_id = $1;', [config_id]);
                    
                    if (team_ids.length > 0) {
                        const values = team_ids.map(team_id => `(${parseInt(config_id)}, ${parseInt(team_id)})`).join(',');
                        const sql = `INSERT INTO client_team_associations (config_id, team_id) VALUES ${values};`;
                        await client.query(sql);
                    }

                    await client.query('COMMIT');
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e; // Rethrow the error to be caught by the outer catch block
                } finally {
                    client.release(); // Release the client back to the pool
                }
                return { statusCode: 201, body: JSON.stringify({ message: 'Associations saved.' }) };
            }
            default:
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        console.error('Database error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
