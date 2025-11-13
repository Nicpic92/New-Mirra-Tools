// This function handles all Create, Read, Update, and Delete (CRUD) operations.
const { Pool } = require('pg');

// Helper function to connect to the database
const getDb = () => new Pool({ connectionString: process.env.DATABASE_URL });

exports.handler = async function(event) {
    const db = getDb();
    const { id } = event.queryStringParameters; // Used for single-item operations

    try {
        switch (event.httpMethod) {
            case 'GET': {
                // THIS IS THE CORRECTED LINE:
                // We now select 'config_data' so the main page has access to the column mappings.
                const result = await db.query('SELECT id, config_name, config_data FROM column_configurations ORDER BY config_name;');
                return { statusCode: 200, body: JSON.stringify(result.rows) };
            }
            case 'POST': {
                // Create a new configuration
                const { config_name, config_data } = JSON.parse(event.body);
                if (!config_name || !config_data) {
                    return { statusCode: 400, body: 'Missing config_name or config_data' };
                }
                const sql = 'INSERT INTO column_configurations (config_name, config_data) VALUES ($1, $2) RETURNING id;';
                const result = await db.query(sql, [config_name, config_data]);
                return { statusCode: 201, body: JSON.stringify(result.rows[0]) };
            }
            case 'PUT': {
                // Update an existing configuration
                if (!id) return { statusCode: 400, body: 'Missing configuration ID' };
                const { config_name, config_data } = JSON.parse(event.body);
                const sql = 'UPDATE column_configurations SET config_name = $1, config_data = $2, last_updated = CURRENT_TIMESTAMP WHERE id = $3;';
                await db.query(sql, [config_name, config_data, id]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Configuration updated' }) };
            }
            case 'DELETE': {
                // Delete a configuration
                if (!id) return { statusCode: 400, body: 'Missing configuration ID' };
                await db.query('DELETE FROM column_configurations WHERE id = $1;', [id]);
                return { statusCode: 200, body: JSON.stringify({ message: 'Configuration deleted' }) };
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
