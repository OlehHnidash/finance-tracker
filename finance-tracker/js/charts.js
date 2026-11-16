/* charts.js – draws the Chart.js bar chart. Receives plain data, knows nothing about storage. */
const Charts = (() => {
  let chart = null; // kept so we can update the existing chart instead of creating a new one each time

  function renderMonthly(monthly) {
    const fallback = document.getElementById('chart-fallback');
    if (typeof Chart === 'undefined') { fallback.hidden = false; return; } // CDN failed to load
    fallback.hidden = true;

    const labels = monthly.map((m) => m.label);
    const incomeData = monthly.map((m) => m.income);
    const expenseData = monthly.map((m) => m.expenses);

    if (chart) { // already created: swap in the new data and redraw
      chart.data.labels = labels;
      chart.data.datasets[0].data = incomeData;
      chart.data.datasets[1].data = expenseData;
      chart.update();
      return;
    }

    Chart.defaults.color = '#8e99b3';
    Chart.defaults.font.family = "'Manrope', system-ui, sans-serif";
    chart = new Chart(document.getElementById('monthly-chart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Income', data: incomeData, backgroundColor: '#4cd9a4', borderRadius: 6 },
          { label: 'Expenses', data: expenseData, backgroundColor: '#ff7b8e', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { align: 'end', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${Transactions.formatMoney(ctx.parsed.y)}` } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: '#262f45' }, ticks: { callback: (v) => '€' + v } }
        }
      }
    });
  }

  return { renderMonthly };
})();
