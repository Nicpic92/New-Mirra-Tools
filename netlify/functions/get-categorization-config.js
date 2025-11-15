// --- START OF FILE get-categorization-config.js (Refactored) ---

const pool = require('./database.js');
const { log, handleError } = require('./utils/logger.js'); // Import the utility

exports.handler = async function(event, context) {
    const functionName = 'get-categorization-config.js'; // Define function name for context

    try {
        log('INFO', functionName, 'Handler invoked. Fetching all categorization rules.');

        const editRulesQuery = `
            SELECT r.config_id, r.edit_text, c.category_name, t.id as team_id, t.team_name, c.send_to_l1_monitor
            FROM claim_edit_rules r
            JOIN claim_categories c ON r.category_id = c.id
            LEFT JOIN teams t ON c.team_id = t.id;
        `;
        const noteRulesQuery = `
            SELECT r.config_id, r.note_keyword, c.category_name, t.id as team_id, t.team_name, c.send_to_l1_monitor
            FROM claim_note_rules r
            JOIN claim_categories c ON r.category_id = c.id
            LEFT JOIN teams t ON c.team_id = t.id;
        `;

        const [editRulesResult, noteRulesResult] = await Promise.all([
            pool.query(editRulesQuery),
            pool.query(noteRulesQuery)
        ]);

        const config = {
            editRules: editRulesResult.rows,
            noteRules: noteRulesResult.rows,
        };

        log('INFO', functionName, 'Successfully fetched all categorization rules.', {
            editRuleCount: editRulesResult.rows.length,
            noteRuleCount: noteRulesResult.rows.length
        });

        return {
            statusCode: 200,
            body: JSON.stringify(config),
        };

    } catch (error) {
        // Use the centralized error handler
        return handleError(error, functionName, event);
    }
};
// --- END OF FILE get-categorization-config.js (Refactored) ---
