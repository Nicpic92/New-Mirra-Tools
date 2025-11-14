// --- START OF FILE get-categorization-config.js ---

const { Pool } = require('pg');

exports.handler = async function(event, context) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        // Query now joins through categories to get team info and L1 flag for each rule
        const editRulesQuery = `
            SELECT r.edit_text, c.category_name, t.id as team_id, t.team_name, c.send_to_l1_monitor
            FROM claim_edit_rules r
            JOIN claim_categories c ON r.category_id = c.id
            JOIN teams t ON c.team_id = t.id;
        `;
        const noteRulesQuery = `
            SELECT r.note_keyword, c.category_name, t.id as team_id, t.team_name, c.send_to_l1_monitor
            FROM claim_note_rules r
            JOIN claim_categories c ON r.category_id = c.id
            JOIN teams t ON c.team_id = t.id;
        `;

        const [editRulesResult, noteRulesResult] = await Promise.all([
            pool.query(editRulesQuery),
            pool.query(noteRulesQuery)
        ]);

        const config = {
            editRules: editRulesResult.rows,
            noteRules: noteRulesResult.rows,
        };

        return {
            statusCode: 200,
            body: JSON.stringify(config),
        };

    } catch (error) {
        console.error("Error fetching categorization config:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to fetch categorization configuration." }),
        };
    } finally {
        await pool.end();
    }
};
// --- END OF FILE get-categorization-config.js ---
