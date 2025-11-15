// --- START OF FILE reports.js ---

// Import shared constants to ensure the report builder and the dashboard use the exact same field definitions.
import { standardFields, availableMetrics } from './utils/constants.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- API Endpoints ---
    const API = {
        TEAMS: '/.netlify/functions/teams',
        CATEGORIES: '/.netlify/functions/categories',
        CONFIG: '/.netlify/functions/configurations',
        TEAM_REPORTS: '/.netlify/functions/team-report-configs',
    };

    // --- Global State ---
    const state = {
        allTeams: [],
        allCategories: [],
        allClientConfigs: [],
        allTeamReportConfigs: [],
    };

    // --- DOM Element Cache ---
    const dom = {
        reportBuilderTeam: document.getElementById('reportBuilderTeam'),
        reportBuilderCategory: document.getElementById('reportBuilderCategory'),
        columnSourceConfig: document.getElementById('columnSourceConfig'),
        builderContainer: document.getElementById('builderContainer'),
        builderHeader: document.getElementById('builderHeader'),
        reportBuilderForm: document.getElementById('reportBuilderForm'),
        teamReportConfigIdInput: document.getElementById('teamReportConfigId'),
        reportDataColumns: document.getElementById('reportDataColumns'),
        reportMetrics: document.getElementById('reportMetrics'),
        reportGroupByColumns: document.getElementById('reportGroupByColumns'),
        teamReportTitleInput: document.getElementById('teamReportTitle'),
        saveReportLayoutBtn: document.getElementById('saveReportLayoutBtn'),
        deleteReportLayoutBtn: document.getElementById('deleteReportLayoutBtn'),
    };

    // --- DATA LOADING ---

    /**
     * Generic fetch wrapper for API calls to handle errors consistently.
     * @param {string} url The API endpoint to fetch.
     * @returns {Promise<any>} The JSON response from the API.
     */
    async function apiCall(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API call to ${url} failed with status ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error(error);
            alert("A critical error occurred while fetching data. Please check the console and refresh the page.");
            throw error;
        }
    }

    /**
     * Loads all initial data required for the report builder page to function.
     */
    async function loadAllData() {
        try {
            const [teams, categories, configs, teamReports] = await Promise.all([
                apiCall(API.TEAMS),
                apiCall(API.CATEGORIES),
                apiCall(API.CONFIG),
                apiCall(API.TEAM_REPORTS)
            ]);
            
            state.allTeams = teams;
            state.allCategories = categories;
            state.allClientConfigs = configs;
            state.allTeamReportConfigs = teamReports;
            
            // Populate the initial dropdowns
            populateTeamSelector();
            populateConfigSelector();

        } catch (error) {
            console.error("Failed to load initial report builder data:", error);
        }
    }

    // --- UI RENDERING & LOGIC ---

    function populateTeamSelector() {
        dom.reportBuilderTeam.innerHTML = '<option value="">Select a team...</option>';
        state.allTeams
            .sort((a, b) => a.team_name.localeCompare(b.team_name))
            .forEach(team => {
                dom.reportBuilderTeam.add(new Option(team.team_name, team.id));
            });
    }

    function populateConfigSelector() {
        dom.columnSourceConfig.innerHTML = '<option value="">Select a config...</option>';
        state.allClientConfigs
            .sort((a, b) => a.config_name.localeCompare(b.config_name))
            .forEach(config => {
                dom.columnSourceConfig.add(new Option(config.config_name, config.id));
            });
    }

    /**
     * Populates the checkbox lists for columns and metrics based on the selected source config.
     */
    function populateBuilderCheckboxes() {
        const configId = dom.columnSourceConfig.value;
        const selectedConfig = state.allClientConfigs.find(c => c.id == configId);
        
        // Clear all checkbox containers
        [dom.reportDataColumns, dom.reportMetrics, dom.reportGroupByColumns].forEach(container => {
            container.innerHTML = '<p class="text-muted small p-2">Select a client configuration to see available options.</p>';
        });

        if (!selectedConfig || !selectedConfig.config_data.columnMappings) return;

        [dom.reportDataColumns, dom.reportMetrics, dom.reportGroupByColumns].forEach(c => c.innerHTML = '');

        const mappedKeys = new Set(Object.keys(selectedConfig.config_data.columnMappings));
        
        // Populate "Data Columns"
        standardFields.forEach(field => {
            if (mappedKeys.has(field.key)) {
                const div = document.createElement('div');
                div.className = 'form-check';
                div.innerHTML = `<input class="form-check-input data-column-checkbox" type="checkbox" value="${field.key}" id="col_${field.key}">
                                 <label class="form-check-label" for="col_${field.key}">${field.displayName}</label>`;
                dom.reportDataColumns.appendChild(div);
            }
        });

        // Populate "Metrics"
        availableMetrics.forEach(metric => {
            const hasRequiredCols = metric.required.every(key => mappedKeys.has(key));
            if (hasRequiredCols) {
                const div = document.createElement('div');
                div.className = 'form-check';
                div.innerHTML = `<input class="form-check-input" type="checkbox" value="${metric.key}" id="met_${metric.key}">
                                 <label class="form-check-label" for="met_${metric.key}">${metric.displayName}</label>`;
                dom.reportMetrics.appendChild(div);
            }
        });
        
        // Add event listener to dynamically update the "Group By" options
        dom.reportDataColumns.addEventListener('change', updateGroupByOptions);
    }
    
    /**
     * Updates the "Group By" checkbox list based on which data columns are selected.
     */
    function updateGroupByOptions() {
        const selectedDataColumns = Array.from(dom.reportDataColumns.querySelectorAll('input:checked'));
        const previouslySelectedGroups = new Set(
            Array.from(dom.reportGroupByColumns.querySelectorAll('input:checked')).map(cb => cb.value)
        );

        dom.reportGroupByColumns.innerHTML = '';

        if (selectedDataColumns.length === 0) {
            dom.reportGroupByColumns.innerHTML = '<p class="text-muted small p-2">Select at least one data column to see grouping options.</p>';
            return;
        }

        selectedDataColumns.forEach(checkbox => {
            const field = standardFields.find(f => f.key === checkbox.value);
            if (field) {
                const div = document.createElement('div');
                div.className = 'form-check';
                const isChecked = previouslySelectedGroups.has(field.key) ? 'checked' : '';
                div.innerHTML = `<input class="form-check-input" type="checkbox" value="${field.key}" id="group_${field.key}" ${isChecked}>
                                 <label class="form-check-label" for="group_${field.key}">${field.displayName}</label>`;
                dom.reportGroupByColumns.appendChild(div);
            }
        });
    }

    /**
     * Loads and displays the existing report configuration for the selected team/category pair.
     */
    function loadExistingReportConfig() {
        const teamId = dom.reportBuilderTeam.value;
        const categoryId = dom.reportBuilderCategory.value;

        // Reset the form and hide the builder
        dom.builderContainer.classList.add('d-none');
        dom.reportBuilderForm.reset();
        dom.teamReportConfigIdInput.value = '';
        dom.deleteReportLayoutBtn.disabled = true;

        if (!teamId || !categoryId) {
            dom.columnSourceConfig.disabled = true;
            return;
        }
        
        dom.columnSourceConfig.disabled = false;
        const team = state.allTeams.find(t => t.id == teamId);
        const category = state.allCategories.find(c => c.id == categoryId);
        dom.builderHeader.textContent = `Building Report For: ${team.team_name} → ${category.category_name}`;

        const existingConfig = state.allTeamReportConfigs.find(c => c.team_id == teamId && c.category_id == categoryId);
        
        if (existingConfig) {
            const layout = existingConfig.report_config_data;
            dom.teamReportConfigIdInput.value = existingConfig.id;
            dom.teamReportTitleInput.value = layout.reportTitle || '';
            dom.columnSourceConfig.value = layout.sourceConfigId || '';
            
            populateBuilderCheckboxes();
            
            if (layout.dataColumns) {
                layout.dataColumns.forEach(key => {
                    const checkbox = document.getElementById(`col_${key}`);
                    if (checkbox) checkbox.checked = true;
                });
            }
             if (layout.metrics) {
                layout.metrics.forEach(key => {
                    const checkbox = document.getElementById(`met_${key}`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            updateGroupByOptions(); // Manually trigger this to populate the group-by section
            
            if (layout.groupBy) {
                layout.groupBy.forEach(key => {
                    const checkbox = document.getElementById(`group_${key}`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            dom.deleteReportLayoutBtn.disabled = false;
        } else {
            // No existing config, so just clear and populate the checkboxes
            dom.columnSourceConfig.value = '';
            populateBuilderCheckboxes();
        }
        
        dom.builderContainer.classList.remove('d-none');
    }

    // --- EVENT HANDLERS ---

    async function handleSaveLayout() {
        const teamId = dom.reportBuilderTeam.value;
        const categoryId = dom.reportBuilderCategory.value;
        const configId = dom.teamReportConfigIdInput.value;
        const sourceConfigId = dom.columnSourceConfig.value;

        if (!teamId || !categoryId || !sourceConfigId) {
            return alert('A team, category, and source client configuration must be selected.');
        }

        const selectedDataColumns = Array.from(dom.reportDataColumns.querySelectorAll('input:checked')).map(cb => cb.value);
        const selectedMetrics = Array.from(dom.reportMetrics.querySelectorAll('input:checked')).map(cb => cb.value);
        const selectedGroupBy = Array.from(dom.reportGroupByColumns.querySelectorAll('input:checked')).map(cb => cb.value);

        if (selectedDataColumns.length === 0 && selectedMetrics.length === 0) {
            return alert('Please select at least one data column or metric for the report.');
        }
        if (selectedGroupBy.length === 0 && selectedMetrics.length > 0) {
            return alert('You must select at least one "Group By" column when including metrics to generate an aggregated report.');
        }
        if (selectedGroupBy.length > 0 && selectedDataColumns.length === 0) {
             return alert('You cannot group by columns that are not selected in the "Data Columns" section.');
        }

        const report_config_data = {
            sourceConfigId: sourceConfigId,
            reportTitle: dom.teamReportTitleInput.value.trim(),
            dataColumns: selectedDataColumns,
            metrics: selectedMetrics,
            groupBy: selectedGroupBy
        };
        
        const method = configId ? 'PUT' : 'POST';
        const url = configId ? `${API.TEAM_REPORTS}?id=${configId}` : API.TEAM_REPORTS;
        
        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_id: parseInt(teamId), category_id: parseInt(categoryId), report_config_data })
            });
            
            alert('Team report layout saved successfully!');
            // Refresh the list of configs from the server
            state.allTeamReportConfigs = await apiCall(API.TEAM_REPORTS);
            loadExistingReportConfig(); // Reload the form with the latest data

        } catch (error) {
            console.error('Failed to save team report layout:', error);
            alert(`Failed to save layout: ${error.message}`);
        }
    }

    async function handleDeleteLayout() {
        const configId = dom.teamReportConfigIdInput.value;
        if (!configId || !confirm('Are you sure you want to delete this report layout? This cannot be undone.')) return;
        
        try {
            await fetch(`${API.TEAM_REPORTS}?id=${configId}`, { method: 'DELETE' });
            alert('Report layout deleted successfully.');
            
            // Refresh the list of configs and reload the form
            state.allTeamReportConfigs = await apiCall(API.TEAM_REPORTS);
            loadExistingReportConfig();

        } catch (error) {
            console.error('Failed to delete team report layout:', error);
            alert(`Failed to delete layout: ${error.message}`);
        }
    }

    function handleTeamChange() {
        const teamId = parseInt(dom.reportBuilderTeam.value, 10);
        
        // Reset and disable subsequent dropdowns and the builder form
        dom.builderContainer.classList.add('d-none');
        dom.reportBuilderCategory.innerHTML = '<option>Select a team...</option>';
        dom.reportBuilderCategory.disabled = true;
        dom.columnSourceConfig.disabled = true;
        if (!teamId) return;
        
        const categoriesForTeam = state.allCategories.filter(c => c.team_id === teamId);
        dom.reportBuilderCategory.innerHTML = '<option value="">Select a category...</option>';
        categoriesForTeam.sort((a, b) => a.category_name.localeCompare(b.category_name)).forEach(cat => {
            dom.reportBuilderCategory.add(new Option(cat.category_name, cat.id));
        });
        dom.reportBuilderCategory.disabled = false;
    }

    // --- INITIALIZATION ---
    function initializeEventListeners() {
        dom.reportBuilderTeam.addEventListener('change', handleTeamChange);
        dom.reportBuilderCategory.addEventListener('change', loadExistingReportConfig);
        dom.columnSourceConfig.addEventListener('change', () => {
            populateBuilderCheckboxes();
        });
        dom.saveReportLayoutBtn.addEventListener('click', handleSaveLayout);
        dom.deleteReportLayoutBtn.addEventListener('click', handleDeleteLayout);
    }

    // --- App Entry Point ---
    initializeEventListeners();
    loadAllData();
});
// --- END OF FILE reports.js ---
