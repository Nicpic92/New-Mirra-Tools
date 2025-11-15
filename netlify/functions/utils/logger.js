// --- START OF FILE utils/logger.js ---

/**
 * Creates a structured JSON log entry and prints it to the console.
 * @param {'INFO' | 'ERROR' | 'WARN'} level The severity level of the log.
 * @param {string} functionName The name of the serverless function where the log originates (e.g., 'teams.js').
 * @param {string} message A human-readable message describing the event.
 * @param {object} details An optional object containing any relevant data to include in the log.
 */
const log = (level, functionName, message, details = {}) => {
    const logObject = {
        timestamp: new Date().toISOString(),
        level,
        functionName,
        message,
        details,
    };
    // In a serverless environment, console.log is redirected to the platform's logging system.
    // By logging a JSON string, we create structured logs that can be easily queried and filtered.
    console.log(JSON.stringify(logObject, null, 2));
};

/**
 * A centralized error handler for all serverless functions.
 * It logs a detailed error for debugging and returns a standardized, safe-to-display
 * error response to the client.
 * @param {Error} error The error object caught in the catch block.
 * @param {string} functionName The name of the function where the error occurred.
 * @param {object} event The incoming event object from the function handler, for context.
 * @returns {object} A standard serverless function response object with a 500 status code.
 */
const handleError = (error, functionName, event) => {
    // Log the detailed error for backend debugging.
    // This includes the full stack trace and details about the request that caused it.
    log('ERROR', functionName, error.message, {
        stack: error.stack,
        path: event ? event.path : 'N/A',
        httpMethod: event ? event.httpMethod : 'N/A',
        queryStringParameters: event ? event.queryStringParameters : {},
    });

    // Return a generic, safe error response to the client.
    // NEVER send the error.stack or detailed internal messages to the frontend.
    return {
        statusCode: 500,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred. The issue has been logged for review.',
            // You can optionally include a reference ID for support tickets.
            // referenceId: some-unique-id
        }),
    };
};

module.exports = {
    log,
    handleError
};
// --- END OF FILE utils/logger.js ---
