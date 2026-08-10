Technical Summary: Evans' Index Plus Calculator
Web Application URL: https://rasan17.github.io/evans-index-plus/
Author & Developer: Dr G Narenthiran FEBNS, FRCS(SN) (
g_narenthiran@hotmail.com
)

🌐 Part 1: How the Global Counter Engine & Separate Metrics Were Solved
1. The Challenge with Local vs. Global Counting
In initial versions, browsers were displaying separate counts per computer because:

Free public counter endpoints returned HTTP 410 (deprecated API versions) or failed CORS preflight checks (OPTIONS HTTP headers).
Whenever a network call failed, the browser silently fell back to localStorage (which only stores data locally on that specific computer/browser).
2. The Solution: CounterAPI v2 Engine & Cache-Busting
Direct REST Querying: Switched to CounterAPI v2 using direct URL queries without custom preflight headers.
Cache-Busting (?_t=TIMESTAMP): Appended live Unix timestamps (Date.now()) and { cache: 'no-store' } to every HTTP request. This prevents Chrome, Safari, and mobile browsers from serving stale cached numbers and forces them to fetch the live database total every time.
3. Separating "App Views" vs. "Calculations Done"
To ensure App Views and Calculations Done operate as two completely independent global counters:

App Views ➔ Channel 1 (up_count):
Increments globally whenever any visitor worldwide opens or refreshes the web application.
Endpoint: https://api.counterapi.dev/v2/test/test/up
Calculations Done ➔ Channel 2 (down_count):
Reads existing totals on page load without incrementing.
Increments globally ONLY when a user enters valid cranial measurements and completes a calculation.
Endpoint: https://api.counterapi.dev/v2/test/test/down
📊 Part 2: How the Longitudinal Bar Graph Was Engineered to Work Without Dates
1. The Problem: The NaN Sorting Bug
Originally, the application:

Filtered time points using tp.date && tp.index !== null. If a user entered measurements without selecting a calendar date, the row was completely ignored.
Attempted to sort undated rows using a.number - b.number. Because number was an undefined property on row data objects, undefined - undefined evaluated to NaN (Not-a-Number) in JavaScript, causing Array.prototype.sort() to fail silently and suppress the Chart.js rendering pipeline.
2. The Solution: Date-Independent Filtering & Fallback Sorting
Date-Independent Qualification: Updated the filtering logic to qualify any row with valid numerical measurements, regardless of whether a date is provided:
javascript


const valid = timePoints.filter(tp => tp.index !== null && !isNaN(tp.index));
Fail-Safe Chronological Sorting: Updated the sorting algorithm to order chronologically when dates are present, while safely preserving insertion order (return 0) when dates are omitted—eliminating NaN sorting errors completely:
javascript


valid.sort((a, b) => {
    if (a.date && b.date) return new Date(a.date) - new Date(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
});
3. Dynamic Smart Bar & Tooltip Labeling
To ensure the graph displays informative X-axis labels under all user input scenarios, the renderer evaluates a 4-tier fallback hierarchy:

Input Provided	X-Axis Bar Label Example	Tooltip Title Example
Context + Date	Pre-Op (Jan 15, 2026)	Pre-Op (Jan 15, 2026)
Context Only	Pre-Op	Pre-Op
Date Only	Jan 15, 2026	Scan Date: Jan 15, 2026
Neither (Undated)	Scan #1, Scan #2	Scan #1
📁 Repository Files Summary
File Name	Purpose
index.html
Structural HTML5 markup, patient details, longitudinal measurement table, KPI dashboard, printable clinical report layout, and copyright notices.
style.css
Glassmorphism dark aesthetic, responsive table design, threshold badges, counter stat bar, and @media print print styling.
script.js
Real-time calculation engine, CounterAPI v2 global counter engine, Chart.js bar renderer, and sample case preset loader.
evans_diagram.jpg
High-definition anatomical CT/MRI scan diagram showing exact Line A (widest frontal horn tips) and Line B (maximal inner skull diameter).
All files are live and hosted at:
👉 https://rasan17.github.io/evans-index-plus/