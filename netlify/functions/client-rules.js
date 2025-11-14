// --- START OF FILE client-rules.js ---

const pool = require('./database.js');

exports.handler = async function(event) {
    try {
        const { type, config_id } = event.queryStringParameters || {};

        if (!['edit', 'note'].includes(type)) {
            return { statusCode: 400, body: 'Invalid rule type specified.' };
        }
        
        if (!config_id) {
            return { statusCode: 400, body: 'Missing config_id parameter.' };
        }

        const tableName = type === 'edit' ? 'claim_edit_rules' : 'claim_note_rules';
        const textField = type === 'edit' ? 'edit_text' : 'note_keyword';

        switch (event.httpMethod) {
            case 'GET': {
                // THE FIX IS HERE: I have removed "r.id" from the SELECT statement.
                const sql = `
                    SELECT r.${textField} as text, r.category_id, c.category_name, t.team_name
                    FROM ${tableName} r
                    LEFT JOIN claim_categories c ON r.category_id = c.id
                    LEFT JOIN teams t ON c.team_id = t.id
                    WHERE r.config_id = $1;
                `;
                const result = await pool.query(sql, [config_id]);
                // Filter out any rules that have a dead reference to a deleted category
                const validRows = result.rows.filter(row => row.category_id !== null && row.category_name !== null);
                return { statusCode: 200, body: JSON.stringify(validRows) };
            }
            case 'POST': {
                const rules = JSON.parse(event.body);
                if (!Array.isArray(rules) || rules.length === 0) {
                    return { statusCode: 400, body: 'Request body must be a non-empty array.' };
                }
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    const sql = `
                        INSERT INTO ${tableName} (config_id, ${textField}, category_id)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (config_id, ${textField})
                        DO UPDATE SET category_id = EXCLUDED.category_id, last_seen = CURRENT_TIMESTAMP;
                    `;
                    for (const rule of rules) {
                        if (rule.text && rule.category_id) {
                            await client.query(sql, [config_id, rule.text, rule.category_id]);
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
            case 'DELETE': {
                const { text } = JSON.parse(event.body);
                if (!text) {
                    return { statusCode: 400, body: 'Missing rule text to delete.' };
                }
                const sql = `DELETE FROM ${tableName} WHERE ${textField} = $1 AND config_id = $2;`;
                await pool.query(sql, [text, config_id]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Rule deleted.' }) };
            }
            default:
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        console.error('!!! UNHANDLED ERROR in client-rules.js:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal Server Error in client-rules.js function.",
                message: error.message,
                stack: error.stack
            })
        };
    }
};
