// --- START OF FILE utils/constants.js ---

/**
 * Defines the master list of standard data fields used across the application.
 * This acts as a "single source of truth" to prevent inconsistencies.
 * - key: The programmatic name used in the code.
 * - displayName: The human-friendly label shown in the UI.
 * - required: (Used in admin panel) whether a mapping is mandatory.
 * - type: (Used in admin panel) helps with validation and UI controls.
 */
export const standardFields = [
    { key: 'claimId', displayName: 'Claim ID / Number', required: true, type: 'string' },
    { key: 'age', displayName: 'Age (in days)', required: true, type: 'number' },
    { key: 'netPayment', displayName: 'Net Payment Amount', required: true, type: 'number' },
    { key: 'state', displayName: 'Claim State', required: true, type: 'string' },
    { key: 'status', displayName: 'Claim Status', required: true, type: 'string' },
    { key: 'networkStatus', displayName: 'Network Status', required: true, type: 'string' },
    { key: 'providerName', displayName: 'Billing Provider Name', required: true, type: 'string' },
    { key: 'edit', displayName: 'Claim Edits', required: true, type: 'string' },
    { key: 'notes', displayName: 'Claim Notes', required: true, type: 'string' },
    { key: 'totalCharges', displayName: 'Total Billed Amount', required: false, type: 'number' },
    { key: 'dsnp', displayName: 'DSNP Status', required: false, type: 'string' },
    { key: 'payer', displayName: 'Payer Name', required: false, type: 'string' },
    { key: 'claimCategory', displayName: 'Category', required: false, type: 'string' },
    { key: 'claimType', displayName: 'Claim Type', required: false, type: 'string' },
    { key: 'receivedDate', displayName: 'Received Date', required: false, type: 'date' },
    { key: 'billingProviderTaxId', displayName: 'Billing Provider Tax ID', required: false, type: 'string' },
    { key: 'billingProviderNpi', displayName: 'Billing Provider NPI', required: false, type: 'string' },
    { key: 'patientName', displayName: 'Patient Name', required: false, type: 'string' },
    { key: 'subscriberId', displayName: 'Subscriber ID', required: false, type: 'string' },
    { key: 'renderingProviderName', displayName: 'Rendering Provider Name', required: false, type: 'string' },
    { key: 'renderingProviderNpi', displayName: 'Rendering Provider NPI', required: false, type: 'string' },
    { key: 'dosFrom', displayName: 'Date of Service (From)', required: false, type: 'date' },
    { key: 'dosTo', displayName: 'Date of Service (To)', required: false, type: 'date' },
    { key: 'cleanAge', displayName: 'Clean Age', required: false, type: 'number' },
    { key: 'pbpName', displayName: 'PBP Name', required: false, type: 'string' },
    { key: 'planName', displayName: 'Plan Name', required: false, type: 'string' },
    { key: 'activityLog', displayName: 'Activity Log Description', required: false, a: 'string' },
    { key: 'activityUser', displayName: 'Activity Performed By', required: false, type: 'string' },
    { key: 'activityDate', displayName: 'Activity Performed On', required: false, type: 'date' }
];

/**
 * Defines the available calculated metrics for reports.
 * This ensures the logic in the dashboard and the configuration in the report builder
 * use the exact same definitions.
 */
export const availableMetrics = [
    { key: 'count', displayName: 'Number of Claims', required: ['claimId'] },
    { key: 'avgAge', displayName: 'Average Claim Age', required: ['age'] },
    { key: 'avgCleanAge', displayName: 'Average Clean Age', required: ['cleanAge'] }
];

// --- END OF FILE utils/constants.js ---
