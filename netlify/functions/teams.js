// This function handles CRUD operations for teams.
const { Pool } = require('pg');

const getDb = () => new Pool({ connectionString: process.env.DATABASE_URL });

exports.handler = async function(event) {
    const db = getDb();
    const { id } = event.queryStringParameters || {};

    try {
        switch (event.httpMethod) {
            case 'GET': {
                const result = await db.query('SELECT * FROM teams ORDER BY team_name;');
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const { team_name } = JSON.parse(event.body);
                if (!team_name) {
                    return { statusCode: 400, body: 'Missing team_name' };
                }
                const sql = 'INSERT INTO teams (team_name) VALUES ($1) RETURNING *;';
                const result = await db.query(sql, [team_name]);
                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'DELETE': {
                if (!id) return { statusCode: 400, body: 'Missing team ID' };
                // Categories assigned to this team will have their team_id set to NULL.
                await db.query('DELETE FROM teams WHERE id = $1;', [id]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Team deleted' }) };
            }
            default:
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        console.error('Database error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    } finally {
        await db.end();
    }
};
