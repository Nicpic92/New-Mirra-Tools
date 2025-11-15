// --- START OF FILE admin.js ---

// Import the single source of truth for standard fields to eliminate code duplication.
import { standardFields } from './utils/constants.js';

// The entire application is wrapped in this event listener to ensure the DOM is fully loaded before any code runs.
document.addEventListener('DOMContentLoaded', () => {
    
    // --- API Endpoints ---
    // Centralize all API endpoint URLs for easier management.
    const API = {
        CONFIG: '/.netlify/functions/configurations',
        TEAMS: '/.netlify/functions/teams',
        CATEGORIES: '/.netlify/functions/categories',
        RULES: '/.netlify/functions/client-rules',
        CLIENT_TEAM: '/.netlify/functions/client-team-associations',
    };
    
    // --- Global State ---
    // A single object to hold all the dynamic data for the admin panel. This avoids polluting the global scope.
    const state = {
        allTeams: [],
        allCategories: [],
        allClientConfigs: [],
        allClientTeamAssociations: [],
        detectedHeaders: [],
        columnMappingsForCategorization: {},
        mappingsForEditing: {},
        currentCustomWidgets: [],
        activeEditRules: [],
        activeNoteRules: [],
        configSpecificRules: { editRulesMap: new Map(), noteRulesMap: new Map() },
        mainReportFullData: [],
        triageClaimsData: [],
    };

    // --- DOM Element Cache ---
    // Cache all DOM element lookups at the start for better performance and cleaner code.
    const dom = {
        configForm: document.getElementById('configForm'),
        configIdInput: document.getElementById('configId'),
        configNameInput: document.getElementById('configName'),
        clientNameInput: document.getElementById('clientName'),
        clearBtn: document.getElementById('clearBtn'),
        reportUploader: document.getElementById('reportUploader'),
        mappingSection: document.getElementById('mappingSection'),
        mappingTableBody: document.getElementById('mappingTableBody'),
        mappingHeader: document.getElementById('mappingHeader'),
        mappingAlert: document.getElementById('mapping-alert'),
        configList: document.getElementById('configList'),
        teamList: document.getElementById('teamList'),
        newTeamForm: document.getElementById('newTeamForm'),
        newTeamNameInput: document.getElementById('newTeamName'),
        teamCategorySelect: document.getElementById('teamCategorySelect'),
        categoryListContainer: document.getElementById('categoryListContainer'),
        newCategoryForm: document.getElementById('newCategoryForm'),
        newCategoryNameInput: document.getElementById('newCategoryName'),
        l1MonitorCheckbox: document.getElementById('l1MonitorCheckbox'),
        categorizationConfigSelector: document.getElementById('categorizationConfigSelector'),
        categorizationReportUploader: document.getElementById('categorizationReportUploader'),
        rulesAssignmentContainer: document.getElementById('rulesAssignmentContainer'),
        uncategorizedEditsTable: document.getElementById('uncategorizedEditsTable'),
        uncategorizedNotesTable: document.getElementById('uncategorizedNotesTable'),
        noRulesFoundDiv: document.getElementById('noRulesFound'),
        saveRulesBtns: document.querySelectorAll('.save-rules-btn'),
        existingEditsTableBody: document.getElementById('existingEditsTableBody'),
        existingNotesTableBody: document.getElementById('existingNotesTableBody'),
        saveExistingChangesBtn: document.getElementById('saveExistingChangesBtn'),
        managePane: document.getElementById('manage-pane'),
        pdfReportTitleInput: document.getElementById('pdfReportTitle'),
        availableWidgetsList: document.getElementById('availableWidgets'),
        reportLayoutList: document.getElementById('reportLayout'),
        customWidgetForm: document.getElementById('customWidgetForm'),
        customWidgetModalEl: document.getElementById('customWidgetModal'),
        customWidgetModal: new bootstrap.Modal(document.getElementById('customWidgetModal')),
        saveWidgetBtn: document.getElementById('saveWidgetBtn'),
        metricTypeSelect: document.getElementById('metricType'),
        metricColumnContainer: document.getElementById('metricColumnContainer'),
        clientTeamConfigSelector: document.getElementById('clientTeamConfigSelector'),
        clientTeamChecklist: document.getElementById('clientTeamChecklist'),
        saveClientTeamAssocsBtn: document.getElementById('saveClientTeamAssocsBtn'),
        clientRuleFilter: document.getElementById('clientRuleFilter'),
        w9TriageSection: document.getElementById('w9TriageSection'),
        triageMrw9Uploader: document.getElementById('triageMrw9Uploader'),
        triageResultsContainer: document.getElementById('triageResultsContainer'),
        triagePlaceholder: document.getElementById('triagePlaceholder'),
        triageTableBody: document.getElementById('triageTableBody'),
        generateAssignmentReportsBtn: document.getElementById('generateAssignmentReportsBtn'),
        triageSummary: document.getElementById('triageSummary'),
        copyMappingModal: new bootstrap.Modal(document.getElementById('copyMappingModal')),
        copySourceConfigSelect: document.getElementById('copySourceConfig'),
        confirmCopyBtn: document.getElementById('confirmCopyBtn'),
        downloadRulesBtn: document.getElementById('downloadRulesBtn'),
        copyRulesBtn: document.getElementById('copyRulesBtn'),
        copyRulesModal: new bootstrap.Modal(document.getElementById('copyRulesModal')),
        copyRulesSourceConfigSelect: document.getElementById('copyRulesSourceConfig'),
        confirmCopyRulesBtn: document.getElementById('confirmCopyRulesBtn'),
        copyEditsCheckbox: document.getElementById('copyEditsCheckbox'),
        copyNotesCheckbox: document.getElementById('copyNotesCheckbox'),
    };

    // This constant is specific to the PDF builder UI on this page.
    const availablePdfWidgets = [
        { id: 'summary', name: 'Executive Summary Cards', type: 'summary' }, { id: 'claimsByFinalStatus', name: 'Claims by Final Status', type: 'table', dataSource: 'claimsByFinalStatus', columns: [{ header: 'Status', dataKey: 'label' }, { header: 'Count', dataKey: 'data' }] }, { id: 'claimsByWorkflowState', name: 'Claims by Workflow State', type: 'table', dataSource: 'claimsByWorkflowState', columns: [{ header: 'State', dataKey: 'label' }, { header: 'Count', dataKey: 'data' }] }, { id: 'topEdits', name: 'Top 10 Claim Edits', type: 'table', dataSource: 'topEdits', columns: [{ header: 'Edit Rule', dataKey: 'label' }, { header: 'Count', dataKey: 'data' }] }, { id: 'topProvidersOverall', name: 'Top 10 Providers (Overall)', type: 'table', dataSource: 'topProvidersOverall', columns: [{ header: 'Provider Name', dataKey: 'label' }, { header: 'Count', dataKey: 'data' }] }, { id: 'agingCombined', name: 'Aging Analysis (Combined)', type: 'aging_table' }, { id: 'agingActive', name: 'Aging Analysis (Active)', type: 'aging_table' }, { id: 'agingPrebatch', name: 'Aging Analysis (Prebatch)', type: 'aging_table' }
    ];

    // --- CORE DATA LOADING & API ABSTRACTIONS ---

    /**
     * Generic fetch wrapper for API calls to handle errors consistently.
     * @param {string} url The API endpoint to fetch.
     * @param {object} [options={}] Optional fetch options (method, body, etc.).
     * @returns {Promise<any>} The JSON response from the API.
     */
    async function apiCall(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`API Error Response: ${errorBody}`);
                throw new Error(`Request failed with status ${response.status}`);
            }
            // Handle responses that might not have a JSON body (e.g., DELETE returning 200 OK)
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return response.json();
            }
            return response.text(); // Or handle as needed
        } catch (error) {
            console.error(`API call to ${url} failed:`, error);
            alert(`An error occurred. Please check the console for details and refresh the page.`);
            throw error;
        }
    }

    /**
     * Loads all necessary data from the backend when the page initializes.
     */
    async function loadAllData() {
        try {
            // Disable selectors during data load to prevent user interaction with incomplete data.
            dom.clientRuleFilter.disabled = true;
            dom.categorizationConfigSelector.disabled = true;
            dom.clientTeamConfigSelector.disabled = true;

            const [teams, categories, configs, clientTeams] = await Promise.all([
                apiCall(API.TEAMS),
                apiCall(API.CATEGORIES),
                apiCall(API.CONFIG),
                apiCall(API.CLIENT_TEAM)
            ]);
            
            state.allTeams = teams;
            state.allCategories = categories;
            state.allClientConfigs = configs;
            state.allClientTeamAssociations = clientTeams;

            // Re-render all UI components that depend on this data.
            renderTeamList();
            populateTeamDropdown();
            renderCategoryList();
            renderConfigList();
            populateConfigSelectors();
            
            // Re-enable selectors.
            dom.clientRuleFilter.disabled = false;
            dom.categorizationConfigSelector.disabled = false;
            dom.clientTeamConfigSelector.disabled = false;
        } catch (error) {
            // Error is already logged by apiCall, but we can add more context here if needed.
            console.error("Failed to complete initial data load.", error);
        }
    }

    /**
     * Fetches the specific edit and note rules for a given client configuration ID.
     * @param {string} configId The ID of the configuration.
     */
    async function loadRulesForConfig(configId) {
        if (!configId) {
            state.activeEditRules = [];
            state.activeNoteRules = [];
            return;
        }
        try {
            const [editRules, noteRules] = await Promise.all([
                apiCall(`${API.RULES}?type=edit&config_id=${configId}`),
                apiCall(`${API.RULES}?type=note&config_id=${configId}`)
            ]);
            state.activeEditRules = editRules;
            state.activeNoteRules = noteRules;
        } catch (error) {
            alert('Could not load categorization rules for the selected client.');
        }
    }

    /**
     * Utility to read an XLSX file and convert it to a JSON object array.
     * @param {File} file The file object from a file input.
     * @returns {Promise<Array<object>>} A promise that resolves with the sheet data.
     */
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                    resolve(jsonData);
                } catch (err) {
                    console.error("Error parsing XLSX file:", err);
                    reject(new Error("Failed to parse the XLSX file. Please ensure it's a valid format."));
                }
            };
            reader.onerror = (err) => {
                console.error("FileReader error:", err);
                reject(new Error("An error occurred while reading the file."));
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // --- UI RENDERING & MANAGEMENT FUNCTIONS ---
    
    function populateConfigSelectors() {
        const selectors = [dom.categorizationConfigSelector, dom.clientTeamConfigSelector, dom.clientRuleFilter, dom.copySourceConfigSelect, dom.copyRulesSourceConfigSelect];
        selectors.forEach(sel => {
            const currentVal = sel.value; // Preserve selection if possible
            sel.innerHTML = '<option selected disabled value="">Select a configuration...</option>';
            state.allClientConfigs.forEach(config => sel.add(new Option(config.config_name, config.id)));
            if (currentVal) sel.value = currentVal;
        });
    }

    function renderConfigList() {
        dom.configList.innerHTML = '';
        if (state.allClientConfigs.length === 0) {
            dom.configList.innerHTML = '<li class="list-group-item">No configurations found.</li>';
            return;
        }
        state.allClientConfigs.forEach(config => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <a href="#" class="config-name flex-grow-1" data-config-id="${config.id}">${config.config_name}</a>
                <button type="button" class="btn btn-danger btn-sm delete-config-btn" data-config-id="${config.id}">Delete</button>
            `;
            dom.configList.appendChild(li);
        });
    }

    function renderTeamList() {
        dom.teamList.innerHTML = '';
        if (state.allTeams.length === 0) {
            dom.teamList.innerHTML = '<li class="list-group-item">No teams defined.</li>';
            return;
        }
        state.allTeams.forEach(team => {
            const li = document.createElement('li');
            li.className = 'list-group-item py-1 d-flex justify-content-between align-items-center';
            li.textContent = team.team_name;
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-outline-danger btn-sm py-0 px-1 btn-delete-rule';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.onclick = () => deleteTeam(team.id);
            li.appendChild(deleteBtn);
            dom.teamList.appendChild(li);
        });
    }

    function populateTeamDropdown() {
        dom.teamCategorySelect.innerHTML = '<option value="">Select a team to add to...</option>';
        state.allTeams.sort((a, b) => a.team_name.localeCompare(b.team_name)).forEach(team => {
            dom.teamCategorySelect.add(new Option(team.team_name, team.id));
        });
    }

    function renderCategoryList() {
        dom.categoryListContainer.innerHTML = '';
        const grouped = state.allCategories.reduce((acc, cat) => {
            const teamName = cat.team_name || 'Unassigned';
            (acc[teamName] = acc[teamName] || []).push(cat);
            return acc;
        }, {});
        Object.keys(grouped).sort().forEach(teamName => {
            const card = document.createElement('div');
            card.className = 'card mb-2';
            card.innerHTML = `<div class="card-header py-1">${teamName}</div>`;
            const list = document.createElement('ul');
            list.className = 'list-group list-group-flush';
            grouped[teamName].sort((a, b) => a.category_name.localeCompare(b.category_name)).forEach(cat => {
                const li = document.createElement('li');
                li.className = 'list-group-item py-1 d-flex justify-content-between align-items-center';
                const nameSpan = document.createElement('span');
                nameSpan.textContent = cat.category_name;
                if (cat.send_to_l1_monitor) {
                    nameSpan.innerHTML += ' <span class="l1-indicator">(L1 Monitor)</span>';
                }
                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'btn btn-outline-danger btn-sm py-0 px-1 btn-delete-rule';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.onclick = () => deleteCategory(cat.id);
                li.appendChild(nameSpan);
                li.appendChild(deleteBtn);
                list.appendChild(li);
            });
            card.appendChild(list);
            dom.categoryListContainer.appendChild(card);
        });
    }

    function renderMappingUI() {
        dom.mappingHeader.innerHTML = `Map Your Fields to Detected Headers: <span class="badge bg-secondary">${state.detectedHeaders.length} columns found</span>`;
        dom.mappingAlert.classList.add('d-none');
        dom.mappingTableBody.innerHTML = '';
        standardFields.forEach(field => {
            const row = dom.mappingTableBody.insertRow();
            row.insertCell().innerHTML = `${field.displayName}${field.required ? ' <span class="text-danger">*</span>' : ''}`;
            const cell2 = row.insertCell();
            const select = document.createElement('select');
            select.className = 'form-select form-select-sm';
            select.dataset.standardKey = field.key;
            select.add(new Option(field.required ? 'Select header...' : 'Optional', ''));
            const savedMapping = state.mappingsForEditing[field.key];
            let bestGuess = savedMapping && state.detectedHeaders.includes(savedMapping) ? savedMapping : '';
            state.detectedHeaders.forEach(header => {
                const option = new Option(header, header);
                if (header === bestGuess) option.selected = true;
                select.add(option);
            });
            cell2.appendChild(select);
        });
        dom.mappingSection.style.display = 'block';
    }
    
    function renderMappingsFromObject(mappings) {
        dom.mappingHeader.innerHTML = 'Current Column Mappings';
        dom.mappingAlert.classList.remove('d-none');
        dom.mappingAlert.textContent = 'Upload a file to create new mappings, or copy from another configuration.';
        dom.mappingTableBody.innerHTML = '';
        const allPossibleHeaders = [...new Set(Object.values(mappings))];
        standardFields.forEach(field => {
            const row = dom.mappingTableBody.insertRow();
            row.insertCell().innerHTML = `${field.displayName}${field.required ? ' <span class="text-danger">*</span>' : ''}`;
            const cell2 = row.insertCell();
            const select = document.createElement('select');
            select.className = 'form-select form-select-sm';
            select.dataset.standardKey = field.key;
            select.add(new Option(field.required ? 'Select header...' : 'Optional', ''));
            const savedValue = mappings[field.key];
            allPossibleHeaders.forEach(header => {
                const option = new Option(header, header);
                if(header === savedValue) option.selected = true;
                select.add(option);
            });
            cell2.appendChild(select);
        });
        dom.mappingSection.style.display = 'block';
    }
    
    function renderExistingRulesTables(editRules = [], noteRules = []) {
        const renderTable = (tableBody, rules) => {
            tableBody.innerHTML = '';
            rules.sort((a, b) => a.text.localeCompare(b.text)).forEach(rule => {
                const row = tableBody.insertRow();
                row.dataset.text = rule.text;
                row.insertCell().innerHTML = `<div class="rule-text" title="${rule.text}">${rule.text}</div>`;
                const categoryCell = row.insertCell();
                categoryCell.appendChild(createCategoryDropdown(rule.category_id));
                row.insertCell().innerHTML = `<button type="button" class="btn btn-danger btn-sm py-0 px-1 btn-delete-rule" data-type="${tableBody.id.includes('Edits') ? 'edit' : 'note'}" data-text="${encodeURIComponent(rule.text)}">&times;</button>`;
            });
        };
        renderTable(dom.existingEditsTableBody, editRules);
        renderTable(dom.existingNotesTableBody, noteRules);
    }
    
    function renderTriageTable() {
        if (state.triageClaimsData.length === 0) {
            dom.triageSummary.textContent = 'No claims matching the triage criteria (i.e., present in both reports, with Status: Management Review, Team: Provider Ops, Category: *W9* as per the selected client\'s rules) were found.';
        } else {
            dom.triageSummary.textContent = `Found ${state.triageClaimsData.length} claims to triage. Default assignments have been suggested below.`;
        }
        dom.triageTableBody.innerHTML = '';
        state.triageClaimsData.forEach((claim, index) => {
            const row = dom.triageTableBody.insertRow();
            row.insertCell().textContent = claim.claimId;
            row.insertCell().textContent = claim.providerName;
            row.insertCell().textContent = claim.providerTin;
            const hasW9Cell = row.insertCell();
            hasW9Cell.textContent = claim.tinHasW9;
            hasW9Cell.style.fontWeight = 'bold';
            hasW9Cell.style.color = claim.tinHasW9 === 'YES' ? '#198754' : '#dc3545';
            const actionCell = row.insertCell();
            const select = document.createElement('select');
            select.className = 'form-select form-select-sm';
            select.dataset.index = index;
            select.innerHTML = `<option value="prov_ops">Assign to Provider Ops</option><option value="l1_monitor">Assign to L1 Monitor</option>`;
            select.value = claim.tinHasW9 === 'YES' ? 'l1_monitor' : 'prov_ops';
            actionCell.appendChild(select);
        });
        dom.triageResultsContainer.classList.remove('d-none');
        dom.triagePlaceholder.classList.add('d-none');
    }

    function createCategoryDropdown(selectedId = '') {
        const select = document.createElement('select');
        select.className = 'form-select form-select-sm';
        select.add(new Option('Select category...', ''));
        state.allCategories.sort((a, b) => (a.team_name || 'Z').localeCompare(b.team_name || 'Z') || a.category_name.localeCompare(b.category_name))
            .forEach(cat => {
                const option = new Option(`${cat.team_name || 'Unassigned'} -> ${cat.category_name}`, cat.id);
                if (String(cat.id) === String(selectedId)) {
                    option.selected = true;
                }
                select.add(option);
            });
        return select;
    }
    
    function clearConfigForm() {
        dom.configForm.reset();
        dom.configIdInput.value = '';
        dom.mappingSection.style.display = 'none';
        dom.mappingAlert.classList.add('d-none');
        state.mappingsForEditing = {};
        dom.reportUploader.value = '';
        state.currentCustomWidgets = [];
        // Future: renderPdfLayout({});
    }

    // --- BUSINESS LOGIC & DATA PROCESSING ---

    function editConfig(configId) {
        const config = state.allClientConfigs.find(c => c.id === configId);
        if (!config) return;
        clearConfigForm();
        dom.configIdInput.value = config.id;
        dom.configNameInput.value = config.config_name;
        dom.clientNameInput.value = config.config_data.clientName || '';
        state.mappingsForEditing = { ...(config.config_data.columnMappings || {}) };
        state.currentCustomWidgets = config.config_data.pdfConfig?.customWidgets || [];
        renderMappingsFromObject(state.mappingsForEditing);
        // Future: populateAvailableWidgets();
        // Future: renderPdfLayout(config.config_data.pdfConfig);
    }

    async function deleteConfig(id) {
        if (!confirm('Are you sure you want to delete this configuration? This cannot be undone.')) return;
        try {
            await apiCall(`${API.CONFIG}?id=${id}`, { method: 'DELETE' });
            alert('Configuration deleted successfully.');
            clearConfigForm();
            await loadAllData();
        } catch (error) {
            alert('Failed to delete configuration.');
        }
    }

    async function deleteTeam(id) {
        if (!confirm('Are you sure? This may unassign categories from this team.')) return;
        try {
            await apiCall(`${API.TEAMS}?id=${id}`, { method: 'DELETE' });
            await loadAllData();
        } catch (error) {
            alert('Failed to delete team.');
        }
    }

    async function deleteCategory(id) {
        if (!confirm('Are you sure? This also deletes all associated categorization rules.')) return;
        try {
            await apiCall(`${API.CATEGORIES}?id=${id}`, { method: 'DELETE' });
            await loadAllData();
        } catch (error) {
            alert('Failed to delete category.');
        }
    }

    async function saveNewRules() {
        const configId = dom.categorizationConfigSelector.value;
        if (!configId) return alert('Cannot save rules without a selected client configuration.');
        
        const getRulesFromTable = (table) => Array.from(table.rows).map(row => ({
            row: row,
            text: row.querySelector('.rule-text').dataset.text,
            category_id: row.cells[1].querySelector('select').value
        })).filter(rule => rule.category_id);

        const editRulesToSave = getRulesFromTable(dom.uncategorizedEditsTable);
        const noteRulesToSave = getRulesFromTable(dom.uncategorizedNotesTable);

        if (editRulesToSave.length === 0 && noteRulesToSave.length === 0) {
            return alert('No new rules were assigned to a category.');
        }

        try {
            const editPromise = editRulesToSave.length > 0 ? apiCall(`${API.RULES}?type=edit&config_id=${configId}`, {
                method: 'POST',
                body: JSON.stringify(editRulesToSave.map(({ row, ...rest }) => rest))
            }) : Promise.resolve();

            const notePromise = noteRulesToSave.length > 0 ? apiCall(`${API.RULES}?type=note&config_id=${configId}`, {
                method: 'POST',
                body: JSON.stringify(noteRulesToSave.map(({ row, ...rest }) => rest))
            }) : Promise.resolve();

            await Promise.all([editPromise, notePromise]);
            
            alert('Rules saved successfully!');
            editRulesToSave.forEach(rule => rule.row.remove());
            noteRulesToSave.forEach(rule => rule.row.remove());
            
            // Refresh rules for the current config
            await loadRulesForConfig(configId);
            
            if (dom.uncategorizedEditsTable.rows.length === 0 && dom.uncategorizedNotesTable.rows.length === 0) {
                dom.rulesAssignmentContainer.style.display = 'none';
                dom.noRulesFoundDiv.textContent = 'Upload a file to begin.';
                dom.noRulesFoundDiv.style.display = 'block';
            }
        } catch (error) {
            alert(`Failed to save rules: ${error.message}`);
        }
    }

    async function deleteRule(type, text) {
        const configId = dom.clientRuleFilter.value;
        if (!configId) return alert('Please select a specific client to delete a rule from.');
        if (!confirm(`Are you sure you want to delete this rule?\n\nTYPE: ${type}\nRULE: ${text}`)) return;
        try {
            await apiCall(`${API.RULES}?type=${type}&config_id=${configId}`, {
                method: 'DELETE',
                body: JSON.stringify({ text })
            });
            await loadRulesForConfig(configId);
            renderExistingRulesTables(state.activeEditRules, state.activeNoteRules);
            alert('Rule deleted.');
        } catch (error) {
            alert(`Error deleting rule: ${error.message}`);
        }
    }

    async function saveExistingRuleChanges() {
        const configId = dom.clientRuleFilter.value;
        if (!configId) return alert('Please select a specific client to save changes for.');
        
        const getChangedRules = (tableBody) => Array.from(tableBody.rows).map(row => ({
            text: row.dataset.text,
            category_id: row.querySelector('select').value
        }));

        const editRulesToUpdate = getChangedRules(dom.existingEditsTableBody);
        const noteRulesToUpdate = getChangedRules(dom.existingNotesTableBody);

        try {
            await Promise.all([
                editRulesToUpdate.length > 0 ? apiCall(`${API.RULES}?type=edit&config_id=${configId}`, { method: 'POST', body: JSON.stringify(editRulesToUpdate) }) : Promise.resolve(),
                noteRulesToUpdate.length > 0 ? apiCall(`${API.RULES}?type=note&config_id=${configId}`, { method: 'POST', body: JSON.stringify(noteRulesToUpdate) }) : Promise.resolve()
            ]);
            alert('Existing rule changes saved successfully!');
            await loadRulesForConfig(configId);
            renderExistingRulesTables(state.activeEditRules, state.activeNoteRules);
        } catch (error) {
            alert(`Error saving changes: ${error.message}`);
        }
    }
    
    function processUploadedReport(data) {
        const detectedEdits = new Set(), detectedNotes = new Set();
        const { edit: editColumn, notes: notesColumn } = state.columnMappingsForCategorization;
        data.forEach(row => {
            const editValue = (row[editColumn] || '').toString().trim();
            if (editValue && !state.activeEditRules.some(r => r.text === editValue)) detectedEdits.add(editValue);
            const noteValue = (row[notesColumn] || '').toString().trim();
            if (noteValue && !state.activeNoteRules.some(r => r.text === noteValue)) detectedNotes.add(noteValue);
        });
        const sortedEdits = Array.from(detectedEdits).sort((a, b) => a.localeCompare(b));
        const sortedNotes = Array.from(detectedNotes).sort((a, b) => a.localeCompare(b));
        
        const populateTable = (tableBody, items) => {
            tableBody.innerHTML = '';
            items.forEach(text => {
                const row = tableBody.insertRow();
                row.insertCell().innerHTML = `<div class="rule-text" title="${text}">${text}</div>`;
                row.cells[0].firstChild.dataset.text = text;
                row.insertCell().appendChild(createCategoryDropdown());
            });
        };
        
        populateTable(dom.uncategorizedEditsTable, sortedEdits);
        populateTable(dom.uncategorizedNotesTable, sortedNotes);
        
        const hasRules = sortedEdits.length > 0 || sortedNotes.length > 0;
        dom.rulesAssignmentContainer.style.display = hasRules ? 'block' : 'none';
        dom.noRulesFoundDiv.textContent = hasRules ? '' : 'No new, uncategorized items were found in the uploaded file.';
        dom.noRulesFoundDiv.style.display = hasRules ? 'none' : 'block';
    }

    async function handleTriageMRW9File(event) {
        const file = event.target.files[0];
        if (!file || state.mainReportFullData.length === 0) return;
        try {
            const mrw9Data = await readFile(file);
            const headers = Object.keys(mrw9Data[0] || {});
            const findHeader = (possibleNames) => { const lowerCaseNames = possibleNames.map(n => n.toLowerCase()); return headers.find(h => lowerCaseNames.includes(h.toLowerCase().trim())); };
            const w9AttachedKey = findHeader(['w9 attached in pv (yes/no)']);
            const taxIdKey = findHeader(['billing tax id']);
            const claimIdKeyMRW9 = findHeader(['claim id']);
            let missingHeaders = [];
            if (!w9AttachedKey) missingHeaders.push("'W9 Attached in PV (YES/NO)'");
            if (!taxIdKey) missingHeaders.push("'Billing TAX ID'");
            if (!claimIdKeyMRW9) missingHeaders.push("'Claim ID'");
            if (missingHeaders.length > 0) { alert(`The MRW9 report is missing the following required columns: ${missingHeaders.join(', ')}. Please check the file and try again.`); event.target.value = ''; return; }
            const mrw9ClaimMap = new Map();
            const tinStatusMap = new Map();
            mrw9Data.forEach(row => {
                const claimId = row[claimIdKeyMRW9]?.toString().trim();
                const tin = row[taxIdKey]?.toString().trim();
                const w9Status = (row[w9AttachedKey] || '').toString().trim().toUpperCase();
                if (claimId) mrw9ClaimMap.set(claimId, row);
                if (tin && w9Status === 'YES') tinStatusMap.set(tin, 'YES');
            });
            
            const getAdminVal = (claim, standardKey) => { const mappedKey = state.columnMappingsForCategorization[standardKey]; return (mappedKey && claim[mappedKey] !== undefined) ? claim[mappedKey] : undefined; };
            const getTriageClaimCategory = (claim) => {
                const notes = (getAdminVal(claim, 'notes') || '').toLowerCase();
                const edit = getAdminVal(claim, 'edit');
                if (edit && state.configSpecificRules.editRulesMap.has(edit)) { return state.configSpecificRules.editRulesMap.get(edit); }
                if (notes) { for (const [keyword, rule] of state.configSpecificRules.noteRulesMap.entries()) { if (notes.includes(keyword)) return rule; } }
                return { category: 'Needs Triage', teamName: 'Needs Assignment' };
            };

            const filteredClaims = state.mainReportFullData.filter(mainClaim => {
                const claimId = getAdminVal(mainClaim, 'claimId')?.toString().trim();
                if (!claimId || !mrw9ClaimMap.has(claimId)) return false;
                const status = (getAdminVal(mainClaim, 'status') || '').toUpperCase();
                const categoryInfo = getTriageClaimCategory(mainClaim);
                const teamName = categoryInfo.teamName;
                const categoryName = (categoryInfo.category || '').toUpperCase();
                return status === 'MANAGEMENTREVIEW' && teamName === 'Provider Operations' && categoryName.includes('W9');
            });
            state.triageClaimsData = filteredClaims.map(claim => { const tin = getAdminVal(claim, 'billingProviderTaxId')?.toString().trim(); const hasW9 = tin && tinStatusMap.has(tin) ? 'YES' : 'NO'; return { claimId: getAdminVal(claim, 'claimId'), providerName: getAdminVal(claim, 'providerName'), providerTin: tin, tinHasW9: hasW9, original: claim }; });
            renderTriageTable();
        } catch (error) { alert(`Error processing MRW9 file: ${error.message}`); }
    }

    function generateTriageReports() {
        const providerOpsClaims = [];
        const l1MonitorClaims = [];
        dom.triageTableBody.querySelectorAll('select').forEach(select => {
            const index = parseInt(select.dataset.index, 10);
            const claimData = state.triageClaimsData[index];
            if (select.value === 'prov_ops') providerOpsClaims.push(claimData.original);
            else l1MonitorClaims.push(claimData.original);
        });
        let generatedCount = 0;
        if (providerOpsClaims.length > 0) {
            const ws = XLSX.utils.json_to_sheet(providerOpsClaims);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Provider Ops Assignments');
            XLSX.writeFile(wb, 'Provider_Ops_W9_Assignments.xlsx');
            generatedCount++;
        }
        if (l1MonitorClaims.length > 0) {
            const ws = XLSX.utils.json_to_sheet(l1MonitorClaims);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'L1 Monitor Assignments');
            XLSX.writeFile(wb, 'L1_Monitor_W9_Assignments.xlsx');
            generatedCount++;
        }
        if (generatedCount === 0) alert("No claims were available to generate reports.");
        else alert("Assignment reports generated successfully.");
    }
    
    // --- EVENT HANDLER SETUP ---

    function initializeEventListeners() {
        dom.configList.addEventListener('click', (e) => {
            if (e.target.classList.contains('config-name')) {
                e.preventDefault();
                editConfig(parseInt(e.target.dataset.configId, 10));
            }
            if (e.target.classList.contains('delete-config-btn')) {
                deleteConfig(parseInt(e.target.dataset.configId, 10));
            }
        });

        dom.configForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const columnMappings = {};
            dom.mappingTableBody.querySelectorAll('select').forEach(sel => {
                if (sel.value) columnMappings[sel.dataset.standardKey] = sel.value;
            });
            const id = dom.configIdInput.value;
            // const pdfConfig = serializePdfLayout(); // Assumes function exists
            let config_data = { clientName: dom.clientNameInput.value, columnMappings /*, pdfConfig*/ };
            if (id) {
                const existingConfig = state.allClientConfigs.find(c => c.id == id);
                if (existingConfig?.config_data?.teamReportLayouts) {
                    config_data.teamReportLayouts = existingConfig.config_data.teamReportLayouts;
                }
            }
            const method = id ? 'PUT' : 'POST';
            const url = id ? `${API.CONFIG}?id=${id}` : API.CONFIG;
            try {
                await apiCall(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config_name: dom.configNameInput.value, config_data }) });
                alert(`Configuration ${id ? 'updated' : 'created'} successfully!`);
                clearConfigForm();
                await loadAllData();
            } catch (error) {
                alert(`Failed to save configuration: ${error.message}`);
            }
        });

        dom.reportUploader.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            try {
                const data = await readFile(file);
                state.detectedHeaders = Object.keys(data[0] || {}).filter(h => h != null && h.toString().trim() !== '');
                if (state.detectedHeaders.length === 0) {
                    alert("Could not detect any column headers in the uploaded file.");
                    return;
                }
                state.mappingsForEditing = {};
                renderMappingUI();
            } catch (err) {
                alert(`Error processing file: ${err.message}`);
            }
        });

        dom.clearBtn.addEventListener('click', clearConfigForm);

        dom.newTeamForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = dom.newTeamNameInput.value.trim();
            if (!name) return;
            try {
                await apiCall(API.TEAMS, { method: 'POST', body: JSON.stringify({ team_name: name }) });
                dom.newTeamNameInput.value = '';
                await loadAllData();
            } catch (error) {
                alert(error.message);
            }
        });

        dom.newCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const category_name = dom.newCategoryNameInput.value.trim();
            const team_id = parseInt(dom.teamCategorySelect.value, 10);
            const send_to_l1_monitor = dom.l1MonitorCheckbox.checked;
            if (!category_name || !team_id) return alert('Please select a team and enter a category name.');
            try {
                await apiCall(API.CATEGORIES, { method: 'POST', body: JSON.stringify({ category_name, team_id, send_to_l1_monitor }) });
                dom.newCategoryNameInput.value = '';
                dom.l1MonitorCheckbox.checked = false;
                await loadAllData();
            } catch (error) {
                alert(error.message);
            }
        });

        dom.categorizationConfigSelector.addEventListener('change', async () => {
            const selectedId = parseInt(dom.categorizationConfigSelector.value, 10);
            if (!selectedId) {
                dom.categorizationReportUploader.disabled = true;
                return;
            }
            await loadRulesForConfig(selectedId);
            const config = state.allClientConfigs.find(c => c.id === selectedId);
            if (config?.config_data?.columnMappings) {
                state.columnMappingsForCategorization = config.config_data.columnMappings;
                const hasRequiredCols = state.columnMappingsForCategorization.edit && state.columnMappingsForCategorization.notes;
                dom.categorizationReportUploader.disabled = !hasRequiredCols;
                if (!hasRequiredCols) alert('Selected config must map both "Claim Edits" and "Claim Notes" to discover new rules.');
                
                const getRuleDetails = (rule) => { const cat = state.allCategories.find(c => c.id === rule.category_id); return cat ? { ...rule, team_name: cat.team_name, category_name: cat.category_name } : null; };
                state.configSpecificRules.editRulesMap = new Map(state.activeEditRules.map(getRuleDetails).filter(Boolean).map(r => [r.text, { category: r.category_name, teamName: r.team_name }]));
                state.configSpecificRules.noteRulesMap = new Map(state.activeNoteRules.map(getRuleDetails).filter(Boolean).map(r => [r.text, { category: r.category_name, teamName: r.team_name }]));

                dom.w9TriageSection.style.display = 'none';
                dom.triageMrw9Uploader.value = '';
                dom.triageResultsContainer.classList.add('d-none');
                dom.triageTableBody.innerHTML = '';
            }
        });

        dom.categorizationReportUploader.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            try {
                const data = await readFile(file);
                state.mainReportFullData = data;
                processUploadedReport(state.mainReportFullData);
                dom.w9TriageSection.style.display = 'block';
                dom.triagePlaceholder.style.display = 'block';
                dom.triageResultsContainer.classList.add('d-none');
                dom.triageMrw9Uploader.value = '';
            } catch (error) {
                alert(`Error processing main report: ${error.message}`);
            }
        });

        dom.saveRulesBtns.forEach(btn => btn.addEventListener('click', saveNewRules));
        dom.saveExistingChangesBtn.addEventListener('click', saveExistingRuleChanges);
        
        dom.managePane.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete-rule')) {
                const type = e.target.dataset.type;
                const text = decodeURIComponent(e.target.dataset.text);
                deleteRule(type, text);
            }
        });

        dom.clientTeamConfigSelector.addEventListener('change', async (e) => {
            const configId = e.target.value;
            if (!configId) {
                dom.clientTeamChecklist.innerHTML = '<small class="text-muted">Select a client to see teams.</small>';
                return;
            }
            const associatedTeamIds = await apiCall(`${API.CLIENT_TEAM}?config_id=${configId}`);
            const teamIdSet = new Set(associatedTeamIds);
            dom.clientTeamChecklist.innerHTML = '';
            state.allTeams.sort((a, b) => a.team_name.localeCompare(b.team_name)).forEach(team => {
                const div = document.createElement('div');
                div.className = 'form-check';
                div.innerHTML = `<input class="form-check-input" type="checkbox" value="${team.id}" id="team_check_${team.id}" ${teamIdSet.has(team.id) ? 'checked' : ''}><label class="form-check-label" for="team_check_${team.id}">${team.team_name}</label>`;
                dom.clientTeamChecklist.appendChild(div);
            });
        });

        dom.saveClientTeamAssocsBtn.addEventListener('click', async () => {
            const config_id = dom.clientTeamConfigSelector.value;
            if (!config_id) {
                alert("Please select a client first.");
                return;
            }
            const team_ids = Array.from(dom.clientTeamChecklist.querySelectorAll('input:checked')).map(input => parseInt(input.value, 10));
            try {
                await apiCall(API.CLIENT_TEAM, { method: 'POST', body: JSON.stringify({ config_id: parseInt(config_id, 10), team_ids }) });
                alert("Client-Team associations saved successfully.");
            } catch (error) {
                alert(`Failed to save associations: ${error.message}`);
            }
        });

        dom.clientRuleFilter.addEventListener('change', async (e) => {
            const configId = e.target.value;
            if (!configId) {
                renderExistingRulesTables([], []);
                dom.downloadRulesBtn.disabled = true;
                dom.copyRulesBtn.disabled = true;
                return;
            }
            await loadRulesForConfig(configId);
            renderExistingRulesTables(state.activeEditRules, state.activeNoteRules);
            dom.downloadRulesBtn.disabled = false;
            dom.copyRulesBtn.disabled = false;
            dom.copyRulesSourceConfigSelect.innerHTML = '<option value="" selected disabled>Select a source client...</option>';
            state.allClientConfigs.filter(c => c.id != configId).forEach(c => dom.copyRulesSourceConfigSelect.add(new Option(c.config_name, c.id)));
        });
        
        dom.confirmCopyBtn.addEventListener('click', () => {
            const sourceId = dom.copySourceConfigSelect.value;
            if (!sourceId) return alert('Please select a source configuration.');
            const sourceConfig = state.allClientConfigs.find(c => c.id == sourceId);
            if (sourceConfig && sourceConfig.config_data.columnMappings) {
                state.mappingsForEditing = { ...sourceConfig.config_data.columnMappings };
                renderMappingsFromObject(state.mappingsForEditing);
                dom.copyMappingModal.hide();
            } else {
                alert('The selected source configuration has no mappings to copy.');
            }
        });

        dom.downloadRulesBtn.addEventListener('click', () => {
            const configId = dom.clientRuleFilter.value;
            const config = state.allClientConfigs.find(c => c.id == configId);
            if (!config || (state.activeEditRules.length === 0 && state.activeNoteRules.length === 0)) {
                return alert('No rules to download for the selected client.');
            }
            const getCategoryInfo = (catId) => { const cat = state.allCategories.find(c => c.id === catId); return cat ? `${cat.category_name} (${cat.team_name || 'Unassigned'})` : 'N/A'; };
            const editData = state.activeEditRules.map(rule => ({ 'Rule Text': rule.text, 'Assigned Category (Team)': getCategoryInfo(rule.category_id) }));
            const noteData = state.activeNoteRules.map(rule => ({ 'Rule Text': rule.text, 'Assigned Category (Team)': getCategoryInfo(rule.category_id) }));
            const wb = XLSX.utils.book_new();
            if (editData.length > 0) { const wsEdit = XLSX.utils.json_to_sheet(editData); wsEdit['!cols'] = [{ wch: 50 }, { wch: 50 }]; XLSX.utils.book_append_sheet(wb, wsEdit, 'Claim Edit Rules'); }
            if (noteData.length > 0) { const wsNote = XLSX.utils.json_to_sheet(noteData); wsNote['!cols'] = [{ wch: 80 }, { wch: 50 }]; XLSX.utils.book_append_sheet(wb, wsNote, 'Claim Note Rules'); }
            const clientName = config.config_name.replace(/ /g, '_');
            XLSX.writeFile(wb, `${clientName}_Categorization_Rules.xlsx`);
        });

        dom.confirmCopyRulesBtn.addEventListener('click', async () => {
            const targetConfigId = dom.clientRuleFilter.value;
            const sourceConfigId = dom.copyRulesSourceConfigSelect.value;
            if (!targetConfigId || !sourceConfigId) return alert('Please select both a source and target client.');
            if (!dom.copyEditsCheckbox.checked && !dom.copyNotesCheckbox.checked) return alert('Please select at least one rule type to copy.');
            
            let sourceEditRules = [], sourceNoteRules = [];
            try {
                [sourceEditRules, sourceNoteRules] = await Promise.all([
                    apiCall(`${API.RULES}?type=edit&config_id=${sourceConfigId}`),
                    apiCall(`${API.RULES}?type=note&config_id=${sourceConfigId}`)
                ]);
            } catch (e) { return; /* apiCall already alerted */ }
            
            const existingEditTexts = new Set(state.activeEditRules.map(r => r.text));
            const existingNoteTexts = new Set(state.activeNoteRules.map(r => r.text));
            const newEditRules = dom.copyEditsCheckbox.checked ? sourceEditRules.filter(r => !existingEditTexts.has(r.text)) : [];
            const newNoteRules = dom.copyNotesCheckbox.checked ? sourceNoteRules.filter(r => !existingNoteTexts.has(r.text)) : [];
            
            if (newEditRules.length === 0 && newNoteRules.length === 0) {
                alert('No new rules to copy. The target client already has all the rules from the source.');
                return;
            }
            try {
                await Promise.all([
                    newEditRules.length > 0 ? apiCall(`${API.RULES}?type=edit&config_id=${targetConfigId}`, { method: 'POST', body: JSON.stringify(newEditRules) }) : Promise.resolve(),
                    newNoteRules.length > 0 ? apiCall(`${API.RULES}?type=note&config_id=${targetConfigId}`, { method: 'POST', body: JSON.stringify(newNoteRules) }) : Promise.resolve()
                ]);
                alert(`Successfully copied ${newEditRules.length} edit rule(s) and ${newNoteRules.length} note rule(s).`);
                dom.copyRulesModal.hide();
                await loadRulesForConfig(targetConfigId);
                renderExistingRulesTables(state.activeEditRules, state.activeNoteRules);
            } catch (error) {
                alert(`An error occurred while copying rules: ${error.message}`);
            }
        });

        dom.triageMrw9Uploader.addEventListener('change', handleTriageMRW9File);
        dom.generateAssignmentReportsBtn.addEventListener('click', generateTriageReports);
        
        // PDF Widget logic could be initialized here if used
    }

    // --- APPLICATION STARTUP ---
    initializeEventListeners();
    loadAllData();
});
// --- END OF FILE admin.js ---
