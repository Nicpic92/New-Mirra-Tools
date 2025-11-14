// --- START OF FILE teams.js ---

const pool = require('./database.js'); // THE FIX: Use the shared pool

exports.handler = async function(event) {
    const { id } = event.queryStringParameters || {};

    try {
        switch (event.httpMethod) {
            case 'GET': {
                const result = await pool.query('SELECT * FROM teams ORDER BY team_name;');
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const { team_name } = JSON.parse(event.body);
                if (!team_name) {
                    return { statusCode: 400, body: 'Missing team_name' };
                }
                const sql = 'INSERT INTO teams (team_name) VALUES ($1) RETURNING *;';
                const result = await pool.query(sql, [team_name]);
                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'DELETE': {
                if (!id) return { statusCode: 400, body: 'Missing team ID' };
                await pool.query('DELETE FROM teams WHERE id = $1;', [id]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Team deleted' }) };
            }
            default:
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        console.error('Database error in teams.js:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
