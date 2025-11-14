// --- START OF FILE categories.js ---

const { Pool } = require('pg');

const getDb = () => new Pool({ connectionString: process.env.DATABASE_URL });

exports.handler = async function(event) {
    const db = getDb();
    const { id } = event.queryStringParameters || {};

    try {
        switch (event.httpMethod) {
            case 'GET': {
                const sql = `
                    SELECT c.id, c.category_name, c.team_id, t.team_name, c.send_to_l1_monitor
                    FROM claim_categories c
                    LEFT JOIN teams t ON c.team_id = t.id
                    ORDER BY t.team_name, c.category_name;
                `;
                const result = await db.query(sql);
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const { category_name, team_id, send_to_l1_monitor } = JSON.parse(event.body);
                if (!category_name || !team_id) {
                    return { statusCode: 400, body: 'Missing category_name or team_id' };
                }
                const sql = 'INSERT INTO claim_categories (category_name, team_id, send_to_l1_monitor) VALUES ($1, $2, $3) RETURNING *;';
                const result = await db.query(sql, [category_name, team_id, send_to_l1_monitor || false]);
                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'DELETE': {
                if (!id) return { statusCode: 400, body: 'Missing category ID' };
                await db.query('DELETE FROM claim_categories WHERE id = $1;', [id]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Category deleted' }) };
            }
            default:
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        console.error('Database error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
    // REMOVED: The finally block with db.end()
};
