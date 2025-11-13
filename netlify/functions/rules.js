// This function handles CRUD operations for categorization rules.
const { Pool } = require('pg');

const getDb = () => new Pool({ connectionString: process.env.DATABASE_URL });

exports.handler = async function(event) {
    const db = getDb();
    const { type } = event.queryStringParameters; // Expects 'edit' or 'note'

    if (!['edit', 'note'].includes(type)) {
        return { statusCode: 400, body: 'Invalid rule type specified.' };
    }

    const tableName = type === 'edit' ? 'claim_edit_rules' : 'claim_note_rules';
    const textField = type === 'edit' ? 'edit_text' : 'note_keyword';

    try {
        switch (event.httpMethod) {
            case 'GET': {
                const sql = `SELECT r.${textField} as text, r.category_id, c.category_name, t.team_name
                             FROM ${tableName} r
                             JOIN claim_categories c ON r.category_id = c.id
                             JOIN teams t ON c.team_id = t.id;`;
                const result = await db.query(sql);
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const rules = JSON.parse(event.body);
                if (!Array.isArray(rules) || rules.length === 0) {
                    return { statusCode: 400, body: 'Request body must be a non-empty array.' };
                }
                const client = await db.connect();
                try {
                    await client.query('BEGIN');
                    const sql = `
                        INSERT INTO ${tableName} (${textField}, category_id)
                        VALUES ($1, $2)
                        ON CONFLICT (${textField})
                        DO UPDATE SET category_id = EXCLUDED.category_id, last_seen = CURRENT_TIMESTAMP;
                    `;
                    for (const rule of rules) {
                        if (rule.text && rule.category_id) {
                            await client.query(sql, [rule.text, rule.category_id]);
                        }
                    }
                    await client.query('COMMIT');
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                } finally {
                    client.release();
                }
                return { statusCode: 201, body: JSON.stringify({ message: 'Rules saved.' }) };
            }
            // NEW DELETE METHOD
            case 'DELETE': {
                const { text } = JSON.parse(event.body);
                if (!text) {
                    return { statusCode: 400, body: 'Missing rule text to delete.' };
                }
                const sql = `DELETE FROM ${tableName} WHERE ${textField} = $1;`;
                await db.query(sql, [text]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Rule deleted.' }) };
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
