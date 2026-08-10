/**
 * Evans' Index Plus Calculator - Interactive Logic & Charting Engine
 * Supervising Developer: Dr G Narenthiran FEBNS, FRCS(SN), g_narenthiran@hotmail.com
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- APP STATE ---
    let timePointCounter = 0;
    let timePoints = []; // Array of { id, date, bifrontal, internal, index, status }
    let evansChartInstance = null;

    // DOM Element References
    const rowsTableBody = document.getElementById('timepoint-rows');
    const btnAddRow = document.getElementById('btn-add-row');
    const btnReset = document.getElementById('btn-reset');
    const btnSample = document.getElementById('btn-sample');
    const btnPrint = document.getElementById('btn-print');
    const unitSelect = document.getElementById('unit-select');
    const currentUnitDisplay = document.getElementById('current-unit-display');
    const totalRowsCount = document.getElementById('total-rows-count');

    // KPI Elements
    const kpiCount = document.getElementById('kpi-count');
    const kpiBaseline = document.getElementById('kpi-baseline');
    const kpiLatest = document.getElementById('kpi-latest');
    const kpiDelta = document.getElementById('kpi-delta');

    // Chart Containers
    const chartPlaceholder = document.getElementById('chart-placeholder');
    const chartContainer = document.getElementById('chart-container');
    const evansChartCanvas = document.getElementById('evansChart');

    // Counter Elements
    const counterViewsEl = document.getElementById('counter-views');
    const counterCalcsEl = document.getElementById('counter-calcs');

    // --- INITIALIZATION ---
    initCounters();
    initApp();

    async function initCounters() {
        if (counterViewsEl) counterViewsEl.textContent = '...';
        if (counterCalcsEl) counterCalcsEl.textContent = '...';

        // 1. Fetch & increment views globally across all computers
        fetchGlobalCounter('views', 'up').then(viewsCount => {
            if (viewsCount !== null && counterViewsEl) {
                counterViewsEl.textContent = viewsCount.toLocaleString();
            } else {
                let localViews = parseInt(localStorage.getItem('evans_app_views') || '0', 10) + 1;
                localStorage.setItem('evans_app_views', localViews.toString());
                if (counterViewsEl) counterViewsEl.textContent = localViews.toLocaleString();
            }
        });

        // 2. Fetch calculations count globally
        fetchGlobalCounter('calcs', 'get').then(calcsCount => {
            if (calcsCount !== null && counterCalcsEl) {
                counterCalcsEl.textContent = calcsCount.toLocaleString();
            } else {
                let localCalcs = parseInt(localStorage.getItem('evans_app_calcs') || '0', 10);
                if (counterCalcsEl) counterCalcsEl.textContent = localCalcs.toLocaleString();
            }
        });
    }

    async function incrementCalcCounter() {
        fetchGlobalCounter('calcs', 'up').then(calcsCount => {
            if (calcsCount !== null && counterCalcsEl) {
                counterCalcsEl.textContent = calcsCount.toLocaleString();
            } else {
                let localCalcs = parseInt(localStorage.getItem('evans_app_calcs') || '0', 10) + 1;
                localStorage.setItem('evans_app_calcs', localCalcs.toString());
                if (counterCalcsEl) counterCalcsEl.textContent = localCalcs.toLocaleString();
            }
        });
    }

    async function fetchGlobalCounter(metricKey, action = 'up') {
        let endpoint = 'https://api.counterapi.dev/v2/test/test';
        if (metricKey === 'views' && action === 'up') {
            endpoint += '/up';
        } else if (metricKey === 'calcs' && action === 'up') {
            endpoint += '/down';
        }

        try {
            const url = `${endpoint}?_t=${Date.now()}`;
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                if (json && json.data) {
                    const count = metricKey === 'views' ? json.data.up_count : json.data.down_count;
                    if (typeof count === 'number') return count;
                }
            }
        } catch (e) {}

        return null;
    }

    function initApp() {
        // Build initial 5 consecutive time point rows as requested
        rowsTableBody.innerHTML = '';
        timePoints = [];
        timePointCounter = 0;

        for (let i = 1; i <= 5; i++) {
            createTimePointRow();
        }

        setupEventListeners();
        updateUIAndAnalytics();
    }

    // --- ROW GENERATION ---
    function createTimePointRow(dateVal = '', contextVal = '', bifrontalVal = '', internalVal = '') {
        timePointCounter++;
        const rowId = `tp-${Date.now()}-${timePointCounter}`;
        const rowNumber = timePointCounter;

        const rowObj = {
            id: rowId,
            number: rowNumber,
            date: dateVal,
            context: contextVal,
            bifrontal: bifrontalVal !== '' ? parseFloat(bifrontalVal) : null,
            internal: internalVal !== '' ? parseFloat(internalVal) : null,
            index: null,
            status: 'incomplete'
        };

        timePoints.push(rowObj);

        // Create HTML TR Element
        const tr = document.createElement('tr');
        tr.id = rowId;
        tr.className = 'tp-row';

        const unitStr = unitSelect.value;

        tr.innerHTML = `
            <td class="col-tp">
                <span class="tp-label"><i class="fa-solid fa-calendar-day"></i> Scan #${timePoints.length}</span>
            </td>
            <td class="col-date">
                <input type="date" class="input-date" value="${dateVal}" aria-label="Scan Date">
            </td>
            <td class="col-context">
                <input type="text" class="input-context" value="${contextVal}" placeholder="e.g. Pre-op, Post-op" aria-label="Clinical Context">
            </td>
            <td class="col-measurement">
                <input type="number" class="input-bifrontal" step="0.1" min="0" placeholder="e.g. 45.0" value="${bifrontalVal}" aria-label="Bifrontal Horn Diameter">
            </td>
            <td class="col-measurement">
                <input type="number" class="input-internal" step="0.1" min="0" placeholder="e.g. 132.0" value="${internalVal}" aria-label="Maximal Internal Skull Diameter">
            </td>
            <td class="col-result">
                <span class="index-display">--</span>
            </td>
            <td class="col-status">
                <span class="badge badge-empty"><i class="fa-solid fa-minus"></i> Incomplete</span>
            </td>
            <td class="col-action">
                <button type="button" class="btn-icon-delete" title="Delete Time Point">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;

        rowsTableBody.appendChild(tr);

        // Bind Row Specific Event Listeners
        const dateInput = tr.querySelector('.input-date');
        const contextInput = tr.querySelector('.input-context');
        const bifrontalInput = tr.querySelector('.input-bifrontal');
        const internalInput = tr.querySelector('.input-internal');
        const btnDelete = tr.querySelector('.btn-icon-delete');

        [dateInput, contextInput, bifrontalInput, internalInput].forEach(input => {
            input.addEventListener('input', () => handleRowUpdate(rowId));
            input.addEventListener('change', () => handleRowUpdate(rowId));
        });

        btnDelete.addEventListener('click', () => deleteTimePointRow(rowId));

        // Initial Row Calculation if pre-filled
        if (bifrontalVal !== '' && internalVal !== '') {
            handleRowUpdate(rowId);
        } else {
            updateTotalRowsBadge();
        }
    }

    function deleteTimePointRow(rowId) {
        if (timePoints.length <= 1) {
            alert('At least one time point row is required.');
            return;
        }

        // Remove from DOM
        const tr = document.getElementById(rowId);
        if (tr) tr.remove();

        // Remove from State
        timePoints = timePoints.filter(tp => tp.id !== rowId);

        // Renumber Labels in DOM
        renumberRowLabels();
        updateTotalRowsBadge();
        updateUIAndAnalytics();
    }

    function renumberRowLabels() {
        const trs = rowsTableBody.querySelectorAll('tr.tp-row');
        trs.forEach((tr, index) => {
            const labelEl = tr.querySelector('.tp-label');
            if (labelEl) {
                labelEl.innerHTML = `<i class="fa-solid fa-calendar-day"></i> Scan #${index + 1}`;
            }
        });
    }

    function updateTotalRowsBadge() {
        totalRowsCount.textContent = timePoints.length;
    }

    // --- CORE COMPUTATION & EVENT HANDLER ---
    function handleRowUpdate(rowId) {
        const tr = document.getElementById(rowId);
        if (!tr) return;

        const rowObj = timePoints.find(tp => tp.id === rowId);
        if (!rowObj) return;

        const dateVal = tr.querySelector('.input-date').value;
        const contextVal = tr.querySelector('.input-context').value;
        const bifrontalVal = parseFloat(tr.querySelector('.input-bifrontal').value);
        const internalVal = parseFloat(tr.querySelector('.input-internal').value);

        const indexDisplay = tr.querySelector('.index-display');
        const statusTd = tr.querySelector('.col-status');

        rowObj.date = dateVal;
        rowObj.context = contextVal;
        rowObj.bifrontal = isNaN(bifrontalVal) ? null : bifrontalVal;
        rowObj.internal = isNaN(internalVal) ? null : internalVal;

        // Perform Evans' Index Calculation
        if (rowObj.bifrontal !== null && rowObj.internal !== null && rowObj.internal > 0) {
            if (rowObj.bifrontal >= rowObj.internal) {
                // Invalid physical measurement
                indexDisplay.textContent = 'Invalid';
                indexDisplay.style.color = 'var(--danger-red)';
                statusTd.innerHTML = `<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> Check Input</span>`;
                rowObj.index = null;
                rowObj.status = 'invalid';
            } else {
                const previousIndex = rowObj.index;
                const computed = rowObj.bifrontal / rowObj.internal;
                rowObj.index = parseFloat(computed.toFixed(3));

                if (previousIndex === null) {
                    incrementCalcCounter();
                }

                indexDisplay.textContent = rowObj.index.toFixed(3);
                indexDisplay.style.color = 'var(--text-primary)';

                if (rowObj.index >= 0.30) {
                    rowObj.status = 'elevated';
                    statusTd.innerHTML = `<span class="badge badge-elevated"><i class="fa-solid fa-circle-exclamation"></i> &ge; 0.30 Elevated</span>`;
                } else {
                    rowObj.status = 'normal';
                    statusTd.innerHTML = `<span class="badge badge-normal"><i class="fa-solid fa-circle-check"></i> &lt; 0.30 Normal</span>`;
                }
            }
        } else {
            indexDisplay.textContent = '--';
            indexDisplay.style.color = 'var(--text-primary)';
            statusTd.innerHTML = `<span class="badge badge-empty"><i class="fa-solid fa-minus"></i> Incomplete</span>`;
            rowObj.index = null;
            rowObj.status = 'incomplete';
        }

        updateUIAndAnalytics();
    }

    // --- SORTING & ANALYTICS ---
    function getSortedValidTimePoints() {
        // Filter rows that have a calculated index (whether date is filled or not!)
        const valid = timePoints.filter(tp => tp.index !== null && !isNaN(tp.index));

        // Sort in ASCENDING CHRONOLOGICAL ORDER of dates if dates exist, maintaining table order for undated rows
        valid.sort((a, b) => {
            if (a.date && b.date) return new Date(a.date) - new Date(b.date);
            if (a.date) return -1;
            if (b.date) return 1;
            return a.number - b.number;
        });
        return valid;
    }

    function updateUIAndAnalytics() {
        const sortedValid = getSortedValidTimePoints();

        // Update KPIs
        kpiCount.textContent = sortedValid.length;

        if (sortedValid.length === 0) {
            kpiBaseline.textContent = '--';
            kpiLatest.textContent = '--';
            kpiDelta.textContent = '--';
        } else {
            const baseline = sortedValid[0].index;
            const latest = sortedValid[sortedValid.length - 1].index;
            const delta = latest - baseline;

            kpiBaseline.textContent = baseline.toFixed(3);
            kpiLatest.textContent = latest.toFixed(3);

            if (sortedValid.length >= 2) {
                const deltaStr = (delta >= 0 ? '+' : '') + delta.toFixed(3);
                const arrowIcon = delta < 0 ? '<i class="fa-solid fa-arrow-down" style="color: var(--success-emerald)"></i>' :
                                 delta > 0 ? '<i class="fa-solid fa-arrow-up" style="color: var(--danger-red)"></i>' :
                                 '<i class="fa-solid fa-arrow-right"></i>';
                kpiDelta.innerHTML = `${arrowIcon} ${deltaStr}`;
            } else {
                kpiDelta.textContent = '--';
            }
        }

        // Render or Update Bar Chart (renders whenever 1 or more valid measurements exist!)
        if (sortedValid.length >= 1) {
            chartPlaceholder.classList.add('hidden');
            chartContainer.classList.remove('hidden');
            renderBarChart(sortedValid);
        } else {
            chartPlaceholder.classList.remove('hidden');
            chartContainer.classList.add('hidden');
        }
    }

    // --- CHART.JS BAR GRAPH RENDERER ---
    function renderBarChart(sortedData) {
        // Labels: Context, Date, or Scan #
        const labels = sortedData.map((item, idx) => {
            const formattedDate = formatDateLabel(item.date);
            if (item.context && formattedDate) {
                return `${item.context} (${formattedDate})`;
            } else if (item.context) {
                return item.context;
            } else if (formattedDate) {
                return formattedDate;
            }
            return `Scan #${item.number}`;
        });
        const dataValues = sortedData.map(item => item.index);

        // Dynamic background colors per bar: Normal (<0.30) vs Elevated (>=0.30)
        const bgColors = sortedData.map(item => item.index >= 0.30 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)');
        const borderColors = sortedData.map(item => item.index >= 0.30 ? '#ef4444' : '#10b981');

        if (evansChartInstance) {
            // Update existing Chart
            evansChartInstance.data.labels = labels;
            evansChartInstance.data.datasets[0].data = dataValues;
            evansChartInstance.data.datasets[0].backgroundColor = bgColors;
            evansChartInstance.data.datasets[0].borderColor = borderColors;
            evansChartInstance.update();
        } else {
            // Create new Chart.js instance
            const ctx = evansChartCanvas.getContext('2d');
            evansChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Evans' Index (Cranial Ratio)",
                        data: dataValues,
                        backgroundColor: bgColors,
                        borderColor: borderColors,
                        borderWidth: 2,
                        borderRadius: 6,
                        barThickness: Math.min(48, Math.max(24, Math.floor(400 / (sortedData.length || 1))))
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 600,
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#38bdf8',
                            bodyColor: '#f8fafc',
                            borderColor: 'rgba(56, 189, 248, 0.3)',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: false,
                            callbacks: {
                                title: function(context) {
                                    const index = context[0].dataIndex;
                                    const item = sortedData[index];
                                    const formattedDate = formatDateLabel(item.date);
                                    if (item.context && formattedDate) return `${item.context} (${formattedDate})`;
                                    if (item.context) return item.context;
                                    if (formattedDate) return `Scan Date: ${formattedDate}`;
                                    return `Scan #${item.number}`;
                                },
                                label: function(context) {
                                    const index = context.dataIndex;
                                    const item = sortedData[index];
                                    const unitStr = unitSelect.value;
                                    const baseline = sortedData[0].index;
                                    const deltaVal = item.index - baseline;
                                    const deltaText = index === 0 ? '(Baseline)' : `(Δ ${deltaVal >= 0 ? '+' : ''}${deltaVal.toFixed(3)})`;
                                    return [
                                        `Evans' Index: ${item.index.toFixed(3)} ${deltaText}`,
                                        `Status: ${item.index >= 0.30 ? 'Ventriculomegaly (>=0.30)' : 'Normal Range (<0.30)'}`,
                                        `Bifrontal: ${item.bifrontal} ${unitStr} | Inner Skull: ${item.internal} ${unitStr}`
                                    ];
                                }
                            }
                        },
                        annotation: {
                            annotations: {
                                thresholdLine: {
                                    type: 'line',
                                    yMin: 0.30,
                                    yMax: 0.30,
                                    borderColor: '#f59e0b',
                                    borderWidth: 2,
                                    borderDash: [6, 4],
                                    label: {
                                        display: true,
                                        content: '0.30 Cut-off Threshold',
                                        position: 'start',
                                        backgroundColor: 'rgba(245, 158, 11, 0.85)',
                                        color: '#000',
                                        font: {
                                            weight: 'bold',
                                            size: 11
                                        },
                                        padding: 4
                                    }
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)'
                            },
                            ticks: {
                                color: '#94a3b8',
                                font: {
                                    family: 'Inter',
                                    size: 12,
                                    weight: '500'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Scan Date (Ascending Chronological Order)',
                                color: '#38bdf8',
                                font: {
                                    family: 'Outfit',
                                    size: 13,
                                    weight: '600'
                                }
                            }
                        },
                        y: {
                            min: 0,
                            suggestedMax: 0.45,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.08)'
                            },
                            ticks: {
                                color: '#94a3b8',
                                stepSize: 0.05,
                                font: {
                                    family: 'Inter',
                                    size: 12
                                }
                            },
                            title: {
                                display: true,
                                text: "Evans' Index (Cranial Ratio)",
                                color: '#38bdf8',
                                font: {
                                    family: 'Outfit',
                                    size: 13,
                                    weight: '600'
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    function formatDateLabel(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return dateStr;
    }

    // --- GLOBAL EVENT HANDLERS ---
    function setupEventListeners() {
        // Add Time Point Button
        btnAddRow.addEventListener('click', () => {
            createTimePointRow();
            updateTotalRowsBadge();
        });

        // Reset Button
        btnReset.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all time points?')) {
                initApp();
            }
        });

        // Load Sample Case Button
        btnSample.addEventListener('click', loadSampleCase);

        // Print / Export Button
        btnPrint.addEventListener('click', generatePrintReport);

        // Unit Selector Change
        unitSelect.addEventListener('change', () => {
            const newUnit = unitSelect.value;
            currentUnitDisplay.textContent = newUnit;
            const unitSpans = document.querySelectorAll('.unit-unit');
            unitSpans.forEach(span => span.textContent = newUnit);
        });
    }

    // --- SAMPLE CASE PRESET ---
    function loadSampleCase() {
        rowsTableBody.innerHTML = '';
        timePoints = [];
        timePointCounter = 0;

        document.getElementById('patient-id').value = 'MRN-774029';
        document.getElementById('patient-name').value = 'H.M.';

        // Sample 5 consecutive time points tracking iNPH before and after VP Shunt
        const sampleData = [
            { date: '2024-01-15', context: 'Baseline (Pre-op)', bifrontal: '48.0', internal: '132.0' },
            { date: '2024-04-10', context: 'Immediate Pre-op', bifrontal: '46.2', internal: '132.0' },
            { date: '2024-06-01', context: '1-Month Post-Shunt', bifrontal: '42.0', internal: '132.0' },
            { date: '2024-09-15', context: '3-Month Post-Shunt', bifrontal: '38.5', internal: '132.0' },
            { date: '2025-01-20', context: '1-Year Followup', bifrontal: '36.0', internal: '132.0' }
        ];

        sampleData.forEach(item => {
            createTimePointRow(item.date, item.context, item.bifrontal, item.internal);
        });

        updateTotalRowsBadge();
        updateUIAndAnalytics();
    }

    // --- PRINT / EXPORT REPORT GENERATOR ---
    function generatePrintReport() {
        const sorted = getSortedValidTimePoints();
        if (sorted.length === 0) {
            alert('Please enter at least one valid Evans\' Index time point to export a report.');
            return;
        }

        document.getElementById('print-patient-id').textContent = document.getElementById('patient-id').value || 'Unspecified';
        document.getElementById('print-patient-name').textContent = document.getElementById('patient-name').value || 'Unspecified';
        document.getElementById('print-modality').textContent = document.getElementById('scan-modality').value;
        document.getElementById('print-date').textContent = new Date().toLocaleDateString();

        const unitStr = unitSelect.value;
        const printTableBody = document.getElementById('print-table-body');
        printTableBody.innerHTML = '';

        sorted.forEach((tp, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Scan #${i + 1}</td>
                <td>${tp.date}</td>
                <td>${tp.context || '--'}</td>
                <td>${tp.bifrontal} ${unitStr}</td>
                <td>${tp.internal} ${unitStr}</td>
                <td><strong>${tp.index.toFixed(3)}</strong></td>
                <td>${tp.index >= 0.30 ? 'Elevated (Ventriculomegaly)' : 'Normal'}</td>
            `;
            printTableBody.appendChild(tr);
        });

        const baseline = sorted[0].index;
        const latest = sorted[sorted.length - 1].index;
        const delta = latest - baseline;
        const deltaStr = (delta >= 0 ? '+' : '') + delta.toFixed(3);

        const summaryEl = document.getElementById('print-summary-text');
        summaryEl.textContent = `A total of ${sorted.length} serial scans were evaluated from ${sorted[0].date} to ${sorted[sorted.length - 1].date}. Baseline Evans' Index was ${baseline.toFixed(3)} and most recent index was ${latest.toFixed(3)} (Net change: ${deltaStr}).`;

        window.print();
    }
});
