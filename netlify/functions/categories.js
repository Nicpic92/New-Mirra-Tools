// This function handles CRUD operations for categorization rules.
const { Pool } = require('pg');

// Helper function to connect to the database
const getDb = () => new Pool({ connectionString: process.env.DATABASE_URL });

exports.handler = async function(event) {
    const db = getDb();
    const { id } = event.queryStringParameters || {};

    try {
        switch (event.httpMethod) {
            case 'GET': {
                const result = await db.query('SELECT * FROM claim_categories ORDER BY category_name;');
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const { category_name } = JSON.parse(event.body);
                if (!category_name) {
                    return { statusCode: 400, body: 'Missing category_name' };
                }
                const sql = 'INSERT INTO claim_categories (category_name) VALUES ($1) RETURNING *;';
                const result = await db.query(sql, [category_name]);
                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'DELETE': {
                if (!id) return { statusCode: 400, body: 'Missing category ID' };
                // The ON DELETE CASCADE in the database schema handles deleting associated rules.
                await db.query('DELETE FROM claim_categories WHERE id = $1;', [id]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Category deleted' }) };
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
