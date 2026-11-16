/* dashboard.js – renders the summary cards, the budget panel and the chart. */
const Dashboard = (() => {
  const $ = (id) => document.getElementById(id);
  const WARNING_THRESHOLD = 0.8; // warn when 80% of the budget is used

  function render(items, budgetLimit) {
    const { income, expenses, balance } = Transactions.summarize(items);
    $('stat-balance').textContent = Transactions.formatMoney(balance);
    $('stat-income').textContent = Transactions.formatMoney(income);
    $('stat-expenses').textContent = Transactions.formatMoney(expenses);

    const spent = Transactions.expensesForMonth(items, Transactions.currentMonthKey());
    renderBudget(spent, budgetLimit);
    Charts.renderMonthly(Transactions.monthlyTotals(items, 6));
  }

  function renderBudget(spent, limit) {
    const remainingEl = $('stat-remaining'), fill = $('budget-fill'), alertEl = $('budget-alert');
    $('budget-input').value = limit || '';
    alertEl.hidden = true;
    fill.className = 'progress-fill';

    if (!limit) { // no budget yet
      remainingEl.textContent = 'Not set'; remainingEl.className = 'stat-value';
      fill.style.width = '0%';
      $('budget-percent').textContent = 'No limit set';
      $('budget-text').textContent = `Spent this month: ${Transactions.formatMoney(spent)}. Set a limit to track it.`;
      return;
    }

    const ratio = spent / limit, remaining = limit - spent;
    remainingEl.textContent = Transactions.formatMoney(remaining);
    remainingEl.className = 'stat-value ' + (remaining < 0 ? 'negative' : 'positive');
    fill.style.width = Math.min(ratio * 100, 100) + '%'; // the bar never grows past 100%
    $('budget-bar').setAttribute('aria-valuenow', Math.round(Math.min(ratio * 100, 100)));
    $('budget-percent').textContent = `${Math.round(ratio * 100)}% used`;
    $('budget-text').textContent = `${Transactions.formatMoney(spent)} of ${Transactions.formatMoney(limit)} spent this month.`;

    if (ratio > 1) {
      fill.classList.add('over'); alertEl.className = 'alert over'; alertEl.hidden = false;
      alertEl.textContent = `Over budget by ${Transactions.formatMoney(spent - limit)}.`;
    } else if (ratio >= WARNING_THRESHOLD) {
      fill.classList.add('warn'); alertEl.className = 'alert'; alertEl.hidden = false;
      alertEl.textContent = `You have used ${Math.round(ratio * 100)}% of your budget. ${Transactions.formatMoney(remaining)} left.`;
    }
  }

  return { render };
})();
