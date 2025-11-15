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
                    
                    for (const rule of rules) {
                        if (rule.text && rule.category_id) {
                            // 1. Check if a rule with this text and config_id already exists.
                            const checkSql = `SELECT id FROM ${tableName} WHERE config_id = $1 AND ${textField} = $2;`;
                            const { rows } = await client.query(checkSql, [config_id, rule.text]);

                            if (rows.length > 0) {
                                // 2. If it exists, UPDATE the existing rule.
                                const existingRuleId = rows[0].id;
                                const updateSql = `UPDATE ${tableName} SET category_id = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2;`;
                                await client.query(updateSql, [rule.category_id, existingRuleId]);
                            } else {
                                // 3. If it does not exist, INSERT a new rule.
                                const insertSql = `INSERT INTO ${tableName} (config_id, ${textField}, category_id) VALUES ($1, $2, $3);`;
                                await client.query(insertSql, [config_id, rule.text, rule.category_id]);
                            }
                        }
                    }
                    
                    await client.query('COMMIT');
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e; // Rethrow to be caught by the outer catch block
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
