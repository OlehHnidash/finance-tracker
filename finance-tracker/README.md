# Personal Finance Tracker

A dark, fintech-style personal finance dashboard built with **HTML5, CSS3 and vanilla JavaScript (ES6+)**.
No frameworks, no build step, no backend. Data is stored in the browser's LocalStorage.
Charts are drawn with [Chart.js](https://www.chartjs.org/) loaded from a CDN.

## How to run

1. Download or copy the `finance-tracker` folder.
2. Double-click `index.html` (or drag it into a browser window).
3. That's it. An internet connection is needed once per page load for Chart.js and the Manrope font
   (both come from CDNs). Without internet the app still works, but the chart shows a notice and the font falls back to your system font.

Optional: serve it with `python3 -m http.server` inside the folder and open `http://localhost:8000`.

## Project structure

```
finance-tracker/
├── index.html            Page structure and forms
├── css/style.css         All styling (dark theme, responsive grid)
└── js/
    ├── storage.js        LocalStorage read/write + validation of saved data
    ├── transactions.js   Business logic: data, validation, filters, totals (no DOM)
    ├── charts.js         Chart.js bar chart
    ├── dashboard.js      Renders summary cards and budget panel
    └── app.js            Events, form handling, list rendering, start-up
```

Scripts are loaded as plain `<script>` tags (not ES modules) so the app works from `file://`.
Each file exposes one object (`Storage`, `Transactions`, `Charts`, `Dashboard`) through an IIFE, which keeps its internals private.

## Implemented features

- **Dashboard:** total balance, total income, total expenses, remaining monthly budget, income vs expenses chart (last 6 months)
- **Transactions:** add, edit, delete; income/expense toggle; amount, category, description, date; clean list, newest first
- **Filters:** by type, category, date range (from/to) and description search; they combine; reset button
- **Budget:** monthly limit, progress bar, warning at 80% used, "over budget" alert above 100%
- **Storage:** everything is saved in LocalStorage and restored on refresh; corrupt or invalid saved data is handled safely
- **Clear all data** with a confirmation dialog; delete also asks for confirmation
- **UX:** inline validation messages, negative/zero/non-numeric amounts rejected, empty states, success toasts, responsive layout, keyboard focus styles
