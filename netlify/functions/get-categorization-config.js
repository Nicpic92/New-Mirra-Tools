const { Pool } = require('pg');

exports.handler = async function(event, context) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const editRulesQuery = `
            SELECT r.edit_text, c.category_name
            FROM claim_edit_rules r
            JOIN claim_categories c ON r.category_id = c.id;
        `;
        
        const editRulesResult = await pool.query(editRulesQuery);

        const config = {
            editRules: editRulesResult.rows,
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
