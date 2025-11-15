// --- START OF FILE index.js ---

// Import shared constants to ensure consistency across the application
import { standardFields, availableMetrics } from './utils/constants.js';

// --- Global State ---
// Encapsulate all state variables into a single object for clarity.
const state = {
    allClaimsData: [],
    aggregatedMetrics: {},
    myCharts: {}, // To hold Chart.js instances
    currentSort: { column: 'priorityScore', direction: 'desc' },
    currentColumnMappings: {},
    allConfigs: [],
    allCategories: [],
    teamReportConfigs: [],
    clientRules: { editRules: [], noteRules: [] },
};

// --- DOM Element References ---
// Cache references to frequently used DOM elements.
const dom = {
    configSelector: document.getElementById('configSelector'),
    clientNameInput: document.getElementById('clientName'),
    reportFileInput: document.getElementById('reportFile'),
    providerReportFileInput: document.getElementById('providerReportFile'),
    dashboardContent: document.getElementById('dashboardContent'),
    teamReportButtons: document.getElementById('teamReportButtons'),
    specialtyReportButtons: document.getElementById('specialtyReportButtons'),
    generatePdfBtn: document.getElementById('generatePdfBtn'),
    summaryCards: document.getElementById('executive-summary-cards'),
    categoryFilter: document.getElementById('categoryFilter'),
    workQueueBody: document.getElementById('work-queue-body'),
    workQueueTableHead: document.getElementById('work-queue-table').querySelector('thead'),
};

// --- CORE LOGIC FUNCTIONS ---

/**
 * Safely retrieves a value from a claim object using the current column mappings.
 * @param {object} claim The raw claim data object.
 * @param {string} standardKey The standard field key (e.g., 'claimId').
 * @param {object} [mappings=state.currentColumnMappings] The mappings to use.
 * @returns {*} The value from the claim, or undefined if not found.
 */
const getVal = (claim, standardKey, mappings) => {
    const effectiveMappings = mappings || state.currentColumnMappings;
    const mappedKey = effectiveMappings[standardKey];
    return (mappedKey && claim[mappedKey] !== undefined) ? claim[mappedKey] : undefined;
};

/**
 * Dynamically determines a claim's category based on client-specific edit and note rules.
 * @param {object} claim The raw claim data object.
 * @returns {object} An object containing category information.
 */
function getClaimCategory(claim) {
    const notes = (getVal(claim, 'notes') || '').toLowerCase();
    const edit = getVal(claim, 'edit');
    
    const categoryMap = new Map(state.allCategories.map(cat => [cat.id, cat]));

    // Check against edit rules first
    const editRule = state.clientRules.editRules.find(r => r.text === edit);
    if (editRule) {
        const category = categoryMap.get(editRule.category_id);
        if (category) return { ...category, category: category.category_name, source: 'Edit Rule' };
    }

    // Then, check against note rules if notes are present
    if (notes) {
        // Sort by length descending to match more specific rules first (e.g., "pending review" before "pending")
        const sortedNoteRules = [...state.clientRules.noteRules].sort((a, b) => b.text.length - a.text.length);
        for (const noteRule of sortedNoteRules) {
            if (notes.includes(noteRule.text)) {
                const category = categoryMap.get(noteRule.category_id);
                if (category) return { ...category, category: category.category_name, source: 'Note Rule' };
            }
        }
    }

    // Default category if no rules match
    return { category: 'Needs Triage', source: 'Default', team_name: 'Needs Assignment', send_to_l1_monitor: false };
}

/**
 * Analyzes and processes the raw claims data from the uploaded file.
 * @param {Array<object>} data The array of raw claim objects.
 * @returns {{claims: Array<object>, metrics: object}} Processed claims and aggregated metrics.
 */
function analyzeAndProcessClaims(data) {
    const metrics = { totalClaims: 0, totalNetPayment: 0, claimsByStatus: {}, providerCounts: {} };
    const actionableStates = ['PEND', 'ONHOLD', 'MANAGEMENTREVIEW'];

    const claims = data.map(rawClaim => {
        const processedClaim = {
            claimId: getVal(rawClaim, 'claimId') || 'N/A',
            state: (getVal(rawClaim, 'state') || 'UNKNOWN').toString().toUpperCase().trim(),
            status: (getVal(rawClaim, 'status') || 'UNKNOWN').toString().toUpperCase().trim(),
            age: parseInt(getVal(rawClaim, 'age') || 0, 10),
            netPayment: parseFloat(getVal(rawClaim, 'netPayment') || 0),
            providerName: getVal(rawClaim, 'providerName') || 'Unknown',
            tinHasW9InPV: 'N/A',
            original: rawClaim, // Keep a reference to the original raw data
        };

        metrics.totalClaims++;
        if (!isNaN(processedClaim.netPayment)) {
            metrics.totalNetPayment += processedClaim.netPayment;
        }
        metrics.claimsByStatus[processedClaim.status] = (metrics.claimsByStatus[processedClaim.status] || 0) + 1;

        processedClaim.isActionable = actionableStates.includes(processedClaim.state);
        if (processedClaim.isActionable) {
            const categoryInfo = getClaimCategory(rawClaim);
            Object.assign(processedClaim, categoryInfo);
            processedClaim.priorityScore = calculatePriorityScore(processedClaim);
        } else {
            processedClaim.category = 'N/A';
            processedClaim.team_name = 'N/A';
            processedClaim.priorityScore = -1;
        }
        return processedClaim;
    });

    return { claims, metrics };
}

/**
 * Calculates a priority score for a claim to rank it in the work queue.
 * @param {object} claim The processed claim object.
 * @returns {number} The calculated priority score.
 */
function calculatePriorityScore(claim) {
    const totalCharges = parseFloat(getVal(claim.original, 'totalCharges') || 0);
    const age = parseInt(claim.age || 0, 10);
    let score = (totalCharges / 500) + (age * 1.5);
    if (claim.status === 'DENY') {
        score += 100;
    }
    return Math.round(score);
}


// --- UI RENDERING FUNCTIONS ---

/**
 * Renders the main dashboard metrics and populates download buttons.
 */
function renderDashboard() {
    const { totalClaims, totalNetPayment, claimsByStatus } = state.aggregatedMetrics;
    const fNum = (num) => num.toLocaleString('en-US');
    const fCur = (num) => num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    dom.summaryCards.innerHTML = `
        <div class="col-md-6 col-lg-3 mb-4"><div class="card dashboard-card h-100"><div class="metric-label">TOTAL CLAIMS</div><div class="metric-value">${fNum(totalClaims)}</div></div></div>
        <div class="col-md-6 col-lg-3 mb-4"><div class="card dashboard-card h-100"><div class="metric-label">TOTAL NET PAYMENT</div><div class="metric-value">${fCur(totalNetPayment)}</div></div></div>
        <div class="col-md-6 col-lg-3 mb-4"><div class="card dashboard-card h-100"><div class="metric-label">PENDING</div><div class="metric-value">${fNum(claimsByStatus['PEND'] || 0)}</div></div></div>
        <div class="col-md-6 col-lg-3 mb-4"><div class="card dashboard-card h-100"><div class="metric-label">DENIED</div><div class="metric-value">${fNum(claimsByStatus['DENY'] || 0)}</div></div></div>
    `;
    populateDownloadButtons();
}

/**
 * Populates the category filter dropdown based on actionable claims.
 */
function populateCategoryFilter() {
    const categories = [...new Set(state.allClaimsData.filter(c => c.isActionable).map(c => c.category))];
    dom.categoryFilter.innerHTML = '<option value="all" selected>All Actionable Categories</option>';
    categories.sort().forEach(cat => dom.categoryFilter.add(new Option(cat, cat)));
}

/**
 * Renders the work queue table with sorted and filtered data.
 */
function renderWorkQueue() {
    const selectedCategory = dom.categoryFilter.value;
    let actionableClaims = state.allClaimsData.filter(c => c.isActionable && (selectedCategory === 'all' || c.category === selectedCategory));

    // Sort the data based on the current sort state
    actionableClaims.sort((a, b) => {
        const valA = a[state.currentSort.column] || 0;
        const valB = b[state.currentSort.column] || 0;
        const direction = state.currentSort.direction === 'asc' ? 1 : -1;
        
        if (typeof valA === 'string') {
            return valA.localeCompare(valB) * direction;
        }
        return (valA - valB) * direction;
    });

    // Generate table rows
    dom.workQueueBody.innerHTML = actionableClaims.map(claim =>
        `<tr>
            <td>${claim.priorityScore}</td>
            <td>${claim.category || 'N/A'}</td>
            <td>${claim.source || 'N/A'}</td>
            <td>${claim.team_name || 'N/A'}</td>
            <td></td> <!-- Prov Ops Team Mbr Placeholder -->
            <td>${claim.w9Attached || ''}</td>
            <td>${claim.tinHasW9InPV || 'N/A'}</td>
            <td>${claim.pvApproved || ''}</td>
            <td>${claim.pvSource || ''}</td>
            <td></td> <!-- PV Updated (Y/N) Placeholder -->
            <td></td> <!-- Notes Placeholder -->
            <td>${claim.claimId || 'N/A'}</td>
            <td>${claim.age || 0}</td>
            <td>$${(claim.netPayment || 0).toFixed(2)}</td>
            <td>${claim.providerName || 'N/A'}</td>
        </tr>`
    ).join('');
}

/**
 * Creates and displays download buttons for team and specialty reports.
 */
function populateDownloadButtons() {
    const actionableClaims = state.allClaimsData.filter(c => c.isActionable);
    const teams = [...new Set(actionableClaims.map(c => c.team_name).filter(Boolean))];

    dom.teamReportButtons.innerHTML = teams.length === 0 ? '<p class="text-muted">No actionable claims found for any team.</p>' : '';
    teams.sort().forEach(teamName => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-success';
        btn.innerHTML = `<i class="bi bi-download"></i> Download ${teamName} Report`;
        btn.onclick = () => downloadTeamReport(teamName, actionableClaims);
        dom.teamReportButtons.appendChild(btn);
    });

    dom.specialtyReportButtons.innerHTML = '';
    const l1MonitorClaims = actionableClaims.filter(c => c.send_to_l1_monitor);
    if (l1MonitorClaims.length > 0) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-info';
        btn.innerHTML = `<i class="bi bi-clipboard-data"></i> Download L1 Monitor Report (${l1MonitorClaims.length} items)`;
        btn.onclick = () => downloadL1MonitorReport(l1MonitorClaims);
        dom.specialtyReportButtons.appendChild(btn);
    }
}


// --- DATA HANDLING & FILE PROCESSING ---

/**
 * Fetches initial configurations and data required for the dashboard to function.
 */
async function loadInitialData() {
    try {
        const [configsRes, categoriesRes, reportsRes] = await Promise.all([
            fetch('/.netlify/functions/configurations'),
            fetch('/.netlify/functions/categories'),
            fetch('/.netlify/functions/team-report-configs')
        ]);
        if (!configsRes.ok || !categoriesRes.ok || !reportsRes.ok) {
            throw new Error('Failed to fetch initial dashboard data.');
        }
        state.allConfigs = await configsRes.json();
        state.allCategories = await categoriesRes.json();
        state.teamReportConfigs = await reportsRes.json();
        
        dom.configSelector.innerHTML = '<option value="">Load a saved configuration...</option>';
        state.allConfigs.forEach(config => dom.configSelector.add(new Option(config.config_name, config.id)));
    } catch (error) {
        console.error('Error loading initial dashboard data:', error);
        alert('Failed to load critical dashboard configurations. Please refresh the page.');
    }
}

/**
 * Handles the main claims data file input and triggers processing.
 * @param {Event | null} event The file input change event, or null if reprocessing.
 * @param {boolean} [isReprocessing=false] Flag indicating if we are reprocessing existing data.
 */
function handleFile(event, isReprocessing = false) {
    if (!isReprocessing && (!event || !event.target.files || !event.target.files[0])) return;
    if (!dom.configSelector.value) {
        alert("Please select a report configuration first.");
        if (event) event.target.value = "";
        return;
    }

    const processAndRender = (data) => {
        try {
            const processedData = analyzeAndProcessClaims(data);
            state.allClaimsData = processedData.claims;
            state.aggregatedMetrics = processedData.metrics;
            renderDashboard();
            populateCategoryFilter();
            dom.providerReportFileInput.disabled = false;
            renderWorkQueue();
            dom.dashboardContent.style.display = 'block';
        } catch (error) {
            console.error("An error occurred during file processing:", error);
            alert("Failed to process the file. Check console for details.");
        }
    };

    if (isReprocessing) {
        // Reprocess using the 'original' raw data stored in each claim object
        processAndRender(state.allClaimsData.map(c => c.original));
        return;
    }

    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            processAndRender(jsonData);
        } catch (readError) {
             console.error("Error reading or parsing the XLSX file:", readError);
             alert("Could not read the file. Please ensure it is a valid XLSX file.");
        }
    };
    reader.onerror = () => {
        console.error("FileReader error.");
        alert("There was an error reading the selected file.");
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Handles the provider verification file input and merges data.
 * @param {Event} event The file input change event.
 */
function handleProviderFile(event) {
    const file = event.target.files[0];
    if (!file || state.allClaimsData.length === 0) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const providerData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            
            const headers = Object.keys(providerData[0] || {});
            const findHeader = (possibleNames) => {
                const lowerCaseNames = possibleNames.map(n => n.toLowerCase());
                return headers.find(h => lowerCaseNames.includes(h.toLowerCase().trim()));
            };
            
            const claimIdKey = findHeader(['claim id', 'claimid', 'claim number']);
            if (!claimIdKey) {
                alert("Could not find a 'Claim ID' column in the Provider Verification report.");
                return;
            }

            const w9AttachedKey = findHeader(['w9 attached', 'w9attached', 'w9 attached?']);
            const isApprovedKey = findHeader(['isapproved in pv', 'approved in pv?', 'pv approved']);
            const sourceKey = findHeader(['source in pv', 'pv source', 'pv notes']);

            const providerMap = new Map(providerData.map(row => {
                const claimId = row[claimIdKey]?.toString();
                if (!claimId) return null;
                return [claimId, {
                    w9Attached: row[w9AttachedKey] || 'N/A',
                    pvApproved: row[isApprovedKey] || 'N/A',
                    pvSource: row[sourceKey] || ''
                }];
            }).filter(Boolean));
            
            state.allClaimsData.forEach(claim => {
                const providerInfo = providerMap.get(claim.claimId);
                if (providerInfo) {
                    Object.assign(claim, providerInfo);
                }
            });

            if (state.currentColumnMappings.billingProviderTaxId) {
                const tinStatusMap = new Map();
                state.allClaimsData.forEach(claim => {
                    const tin = getVal(claim.original, 'billingProviderTaxId');
                    if (tin && claim.w9Attached?.toString().trim().toUpperCase() === 'YES') {
                        tinStatusMap.set(tin, 'YES');
                    }
                });
                state.allClaimsData.forEach(claim => {
                    const tin = getVal(claim.original, 'billingProviderTaxId');
                    claim.tinHasW9InPV = (tin && tinStatusMap.has(tin)) ? 'YES' : 'NO';
                });
            }

            renderWorkQueue();
            alert(`Successfully merged data from ${providerMap.size} provider verification records.`);
        } catch (readError) {
             console.error("Error reading or parsing the provider verification file:", readError);
             alert("Could not read the provider file. Please ensure it is a valid XLSX file.");
        }
    };
     reader.onerror = () => {
        console.error("FileReader error on provider file.");
        alert("There was an error reading the provider verification file.");
    };
    reader.readAsArrayBuffer(file);
}


// --- EVENT HANDLERS ---

/**
 * Handles changes to the main configuration selector dropdown.
 * @param {Event} e The change event.
 */
async function onConfigChange(e) {
    const selectedId = e.target.value;
    const selectedConfig = state.allConfigs.find(c => c.id == selectedId);
    state.clientRules = { editRules: [], noteRules: [] };
    
    if (selectedConfig?.config_data) {
        dom.clientNameInput.value = selectedConfig.config_data.clientName || '';
        state.currentColumnMappings = selectedConfig.config_data.columnMappings || {};
        
        try {
            const [editRes, noteRes] = await Promise.all([
                fetch(`/.netlify/functions/client-rules?type=edit&config_id=${selectedId}`),
                fetch(`/.netlify/functions/client-rules?type=note&config_id=${selectedId}`)
            ]);
            if (!editRes.ok || !noteRes.ok) throw new Error('Failed to fetch rules.');
            state.clientRules.editRules = await editRes.json();
            state.clientRules.noteRules = await noteRes.json();
        } catch (error) {
            console.error('Error loading client-specific rules:', error);
            alert('Could not load categorization rules. Categorization may be incorrect.');
        }
        
        // If data is already loaded, re-process it with the new rules
        if (state.allClaimsData.length > 0) {
            handleFile(null, true);
        }
    } else {
        dom.clientNameInput.value = '';
        state.currentColumnMappings = {};
    }
}

/**
 * Handles clicks on the work queue table header for sorting.
 * @param {Event} e The click event.
 */
function onSortTable(e) {
    const header = e.target.closest('th');
    if (header?.dataset.sort) {
        const sortKey = header.dataset.sort;
        if (state.currentSort.column === sortKey) {
            state.currentSort.direction = (state.currentSort.direction === 'desc') ? 'asc' : 'desc';
        } else {
            state.currentSort.column = sortKey;
            state.currentSort.direction = 'desc';
        }
        renderWorkQueue();
    }
}

// --- INITIALIZATION ---

/**
 * Sets up all event listeners for the page.
 */
function initializeEventListeners() {
    dom.configSelector.addEventListener('change', onConfigChange);
    dom.reportFileInput.addEventListener('change', (e) => handleFile(e, false));
    dom.providerReportFileInput.addEventListener('change', handleProviderFile);
    dom.generatePdfBtn.addEventListener('click', () => alert('PDF generation is a complex feature and is stubbed out for this example.'));
    dom.workQueueTableHead.addEventListener('click', onSortTable);
    dom.categoryFilter.addEventListener('change', () => renderWorkQueue());
}

// --- REPORT DOWNLOAD FUNCTIONS (Remain Largely Unchanged) ---

function downloadTeamReport(teamName, allActionableClaims) {
    const teamClaims = allActionableClaims.filter(c => c.team_name === teamName);
    if (teamClaims.length === 0) return alert(`No claims for team: ${teamName}`);
    const wb = XLSX.utils.book_new();
    const today = new Date().toISOString().slice(0, 10);
    const standardFieldMap = new Map(standardFields.map(f => [f.key, f.displayName]));
    availableMetrics.forEach(m => standardFieldMap.set(m.key, m.displayName));
    const claimsByReportFormat = teamClaims.reduce((acc, claim) => {
        const teamId = parseInt(claim.team_id, 10);
        const categoryId = parseInt(claim.id, 10);
        const customReportConfig = (teamId && categoryId) ? state.teamReportConfigs.find(rc => rc.team_id === teamId && rc.category_id === categoryId) : null;
        const key = customReportConfig ? `config_${customReportConfig.id}` : (claim.category || 'Uncategorized');
        (acc[key] = acc[key] || []).push(claim);
        return acc;
    }, {});
    for (const key in claimsByReportFormat) {
        const claimsInGroup = claimsByReportFormat[key];
        const categoryName = claimsInGroup[0].category;
        let reportData = [];
        if (key.startsWith('config_')) {
            const configId = parseInt(key.split('_')[1], 10);
            const customReportConfig = state.teamReportConfigs.find(rc => rc.id === configId);
            if (customReportConfig && customReportConfig.report_config_data) {
                const { dataColumns = [], metrics = [], groupBy = [], sourceConfigId } = customReportConfig.report_config_data;
                const sourceConfig = state.allConfigs.find(c => c.id == sourceConfigId);
                if (!sourceConfig) {
                    reportData = claimsInGroup.map(claim => ({ ...claim.original, 'ERROR': `Could not find Source Config ID ${sourceConfigId}` }));
                } else {
                    const reportMappings = sourceConfig.config_data.columnMappings;
                    const allColumnKeys = [...new Set([...dataColumns, ...groupBy, ...metrics])];
                    if (groupBy.length > 0) {
                        const aggregatedData = new Map();
                        claimsInGroup.forEach(claim => {
                            const groupByKey = groupBy.map(stdKey => getVal(claim.original, stdKey, reportMappings) || 'N/A').join('|');
                            if (!aggregatedData.has(groupByKey)) {
                                const initialRow = {};
                                [...new Set([...dataColumns, ...groupBy])].forEach(stdKey => {
                                    const header = standardFieldMap.get(stdKey) || stdKey;
                                    initialRow[header] = getVal(claim.original, stdKey, reportMappings) || 'N/A';
                                });
                                initialRow._metrics = { count: 0, totalAge: 0, totalCleanAge: 0 };
                                aggregatedData.set(groupByKey, initialRow);
                            }
                            const group = aggregatedData.get(groupByKey);
                            group._metrics.count++;
                            group._metrics.totalAge += (parseInt(getVal(claim.original, 'age', reportMappings), 10) || 0);
                            group._metrics.totalCleanAge += (parseInt(getVal(claim.original, 'cleanAge', reportMappings), 10) || 0);
                        });
                        reportData = Array.from(aggregatedData.values()).map(group => {
                            const finalRow = { ...group };
                            if (metrics.includes('count')) finalRow[standardFieldMap.get('count')] = group._metrics.count;
                            if (metrics.includes('avgAge')) finalRow[standardFieldMap.get('avgAge')] = group._metrics.count > 0 ? (group._metrics.totalAge / group._metrics.count).toFixed(1) : 0;
                            if (metrics.includes('avgCleanAge')) finalRow[standardFieldMap.get('avgCleanAge')] = group._metrics.count > 0 ? (group._metrics.totalCleanAge / group._metrics.count).toFixed(1) : 0;
                            delete finalRow._metrics;
                            return finalRow;
                        });
                    } else {
                        reportData = claimsInGroup.map(claim => {
                            const row = {};
                            allColumnKeys.forEach(stdKey => {
                                const header = standardFieldMap.get(stdKey) || stdKey;
                                row[header] = getVal(claim.original, stdKey, reportMappings);
                            });
                            return row;
                        });
                    }
                }
            }
        } else {
            reportData = claimsInGroup.map(claim => ({ ...claim.original, 'Category': claim.category, 'Assigned Team': claim.team_name }));
        }
        if (reportData.length > 0) {
            reportData.forEach(row => { row['Prov Ops Team Mbr'] = ''; row['PV Updated (Y/N)'] = ''; row['Notes'] = ''; });
            const ws = XLSX.utils.json_to_sheet(reportData);
            const safeSheetName = categoryName.replace(/[\/\\?*\[\]]/g, '').substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        }
    }
    if (wb.SheetNames.length > 0) {
        wb.SheetNames.sort();
        const clientName = dom.clientNameInput.value.trim().replace(/ /g, '_') || 'Client';
        const safeTeamName = teamName.replace(/ /g, '_');
        XLSX.writeFile(wb, `${clientName}_${safeTeamName}_Report_${today}.xlsx`);
    } else {
        alert(`No data available to generate a report for team: ${teamName}`);
    }
}

function downloadL1MonitorReport(l1Claims) {
    const today = new Date().toISOString().slice(0, 10);
    const clientName = dom.clientNameInput.value.trim().replace(/ /g, '_') || 'Client';
    const reportData = l1Claims.map(claim => ({
        'Claim ID': claim.claimId, 'Category': claim.category, 'Assigned Team': claim.team_name, 'Age (Days)': claim.age,
        'Amount at Risk': claim.netPayment, 'Billing Provider Name': claim.providerName,
        'Billing Provider Tax ID': getVal(claim.original, 'billingProviderTaxId'),
        'TIN Has W9 in PV': claim.tinHasW9InPV, 'Claim-Specific W9 Attached': claim.w9Attached, 'Claim-Specific PV Notes': claim.pvSource
    }));
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'L1 Monitor Items');
    XLSX.writeFile(wb, `${clientName}_L1_Monitor_Report_${today}.xlsx`);
}

// --- App Entry Point ---
// When the DOM is fully loaded, initialize the event listeners and load the initial data.
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadInitialData();
});

// --- END OF FILE index.js ---
