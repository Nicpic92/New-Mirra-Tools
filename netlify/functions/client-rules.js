// --- START OF FILE client-rules.js (Refactored) ---

const pool = require('./database.js');
const { log, handleError } = require('./utils/logger.js'); // Import the utility

exports.handler = async function(event) {
    const functionName = 'client-rules.js'; // Define function name for context

    try {
        const { type, config_id } = event.queryStringParameters || {};

        log('INFO', functionName, 'Handler invoked.', {
            httpMethod: event.httpMethod,
            type: type || 'N/A',
            config_id: config_id || 'N/A'
        });

        if (!['edit', 'note'].includes(type)) {
            log('WARN', functionName, 'Bad Request: Invalid rule type specified.', { type });
            return { statusCode: 400, body: 'Invalid rule type specified.' };
        }
        
        if (!config_id) {
            log('WARN', functionName, 'Bad Request: Missing config_id parameter.');
            return { statusCode: 400, body: 'Missing config_id parameter.' };
        }

        const tableName = type === 'edit' ? 'claim_edit_rules' : 'claim_note_rules';
        const textField = type === 'edit' ? 'edit_text' : 'note_keyword';

        switch (event.httpMethod) {
            case 'GET': {
                const sql = `
                    SELECT r.${textField} as text, r.category_id, c.category_name, t.team_name
                    FROM ${tableName} r
                    INNER JOIN claim_categories c ON r.category_id = c.id
                    LEFT JOIN teams t ON c.team_id = t.id
                    WHERE r.config_id = $1;
                `;
                const result = await pool.query(sql, [config_id]);
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                const rules = JSON.parse(event.body);
                if (!Array.isArray(rules) || rules.length === 0) {
                    log('WARN', functionName, 'Bad Request: Body must be a non-empty array.', { config_id });
                    return { statusCode: 400, body: 'Request body must be a non-empty array.' };
                }
                
                log('INFO', functionName, `Starting transaction to save ${rules.length} rules for config_id: ${config_id}`);

                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    
                    for (const rule of rules) {
                        if (rule.text && rule.category_id) {
                            const checkSql = `SELECT id FROM ${tableName} WHERE config_id = $1 AND ${textField} = $2;`;
                            const { rows } = await client.query(checkSql, [config_id, rule.text]);

                            if (rows.length > 0) {
                                const existingRuleId = rows[0].id;
                                const updateSql = `UPDATE ${tableName} SET category_id = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2;`;
                                await client.query(updateSql, [rule.category_id, existingRuleId]);
                                log('INFO', functionName, `UPDATED rule for config_id ${config_id}`, { ruleText: rule.text, newCategoryId: rule.category_id });
                            } else {
                                const insertSql = `INSERT INTO ${tableName} (config_id, ${textField}, category_id) VALUES ($1, $2, $3);`;
                                await client.query(insertSql, [config_id, rule.text, rule.category_id]);
                                log('INFO', functionName, `INSERTED new rule for config_id ${config_id}`, { ruleText: rule.text, categoryId: rule.category_id });
                            }
                        }
                    }
                    
                    await client.query('COMMIT');
                    log('INFO', functionName, `COMMITTED transaction for config_id: ${config_id}`);
                } catch (e) {
                    await client.query('ROLLBACK');
                    log('ERROR', functionName, `Transaction ROLLED BACK for config_id: ${config_id}`, { errorMessage: e.message });
                    throw e; // Rethrow to be caught by the outer catch block
                } finally {
                    client.release();
                }
                return { statusCode: 201, body: JSON.stringify({ message: 'Rules saved.' }) };
            }
            case 'DELETE': {
                const { text } = JSON.parse(event.body);
                if (!text) {
                    log('WARN', functionName, 'Bad Request: Missing rule text to delete.', { config_id });
                    return { statusCode: 400, body: 'Missing rule text to delete.' };
                }
                const sql = `DELETE FROM ${tableName} WHERE ${textField} = $1 AND config_id = $2;`;
                await pool.query(sql, [text, config_id]);
                log('INFO', functionName, `DELETED rule for config_id: ${config_id}`, { ruleText: text });
                return { statusCode: 200, body: JSON.stringify({ message: 'Rule deleted.' }) };
            }
            default:
                log('WARN', functionName, `Method Not Allowed: ${event.httpMethod}`);
                return { statusCode: 405, body: 'Method Not Allowed' };
        }
    } catch (error) {
        // All unhandled errors will be caught and logged consistently here.
        return handleError(error, functionName, event);
    }
};
// --- END OF FILE client-rules.js (Refactored) ---
