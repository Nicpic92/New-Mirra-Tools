// --- START OF FILE configurations.js ---

const pool = require('./database.js'); // THE FIX: Use the shared pool

exports.handler = async function(event) {
    const { id } = event.queryStringParameters || {};

    try {
        switch (event.httpMethod) {
            case 'GET': {
                const result = await pool.query('SELECT id, config_name, config_data FROM column_configurations ORDER BY config_name;');
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const { config_name, config_data } = JSON.parse(event.body);
                if (!config_name || !config_data) {
                    return { statusCode: 400, body: 'Missing config_name or config_data' };
                }
                const sql = 'INSERT INTO column_configurations (config_name, config_data) VALUES ($1, $2) RETURNING id;';
                const result = await pool.query(sql, [config_name, config_data]);
                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'PUT': {
                if (!id) return { statusCode: 400, body: 'Missing configuration ID' };
                const { config_name, config_data } = JSON.parse(event.body);
                const sql = 'UPDATE column_configurations SET config_name = $1, config_data = $2, last_updated = CURRENT_TIMESTAMP WHERE id = $3;';
                await pool.query(sql, [config_name, config_data, id]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Configuration updated' }) };
            }
            case 'DELETE': {
                if (!id) return { statusCode: 400, body: 'Missing configuration ID' };
                await pool.query('DELETE FROM column_configurations WHERE id = $1;', [id]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Configuration deleted' }) };
            }
            default:
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error)
        console.error('Database error in configurations.js:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
