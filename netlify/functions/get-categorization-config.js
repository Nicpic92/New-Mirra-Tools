// --- START OF FILE get-categorization-config.js ---

const { Pool } = require('pg');

// Create the connection pool ONCE, outside the handler
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

exports.handler = async function(event, context) {
    try {
        const editRulesQuery = `
            SELECT r.edit_text, c.category_name, t.id as team_id, t.team_name, c.send_to_l1_monitor
            FROM claim_edit_rules r
            JOIN claim_categories c ON r.category_id = c.id
            LEFT JOIN teams t ON c.team_id = t.id;
        `;
        const noteRulesQuery = `
            SELECT r.note_keyword, c.category_name, t.id as team_id, t.team_name, c.send_to_l1_monitor
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
    }
};
