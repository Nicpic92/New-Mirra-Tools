// --- START OF FILE rules.js (Final Diagnostic Version) ---

// This version's ONLY purpose is to test if the 'pg' library can be loaded.
// It does NOT connect to the database.

// Try to load the dependency. If this line causes a crash, the dependency is missing in the deployment.
const { Pool } = require('pg');

exports.handler = async function(event) {
    // If the function gets this far without crashing, it means 'require("pg")' was successful.
    console.log("--- rules.js loaded 'pg' successfully ---");

    // We will return a fake, empty array so the admin page doesn't break.
    // The real test is whether we get a 200 OK or a 502 error.
    return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ "message": "PG library was loaded successfully, but this is a debug response." }])
    };
};
