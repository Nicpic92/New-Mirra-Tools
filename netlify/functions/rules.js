// This function handles saving the rules that map edits to categories.
const { Pool } = require('pg');

const getDb = () => new Pool({ connectionString: process.env.DATABASE_URL });

exports.handler = async function(event) {
    const db = getDb();
    
    // Simplified: This function now only handles edit rules.
    const tableName = 'claim_edit_rules';
    const textField = 'edit_text';

    try {
        switch (event.httpMethod) {
            case 'GET': {
                const sql = `SELECT ${textField} as text, category_id FROM ${tableName};`;
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
