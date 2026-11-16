/* transactions.js – business logic: data, validation, filtering, calculations.
   Nothing in this file touches the DOM. */
const Transactions = (() => {
  const CATEGORIES = {
    expense: ['Housing', 'Groceries', 'Dining', 'Transport', 'Utilities', 'Subscriptions', 'Health', 'Shopping', 'Entertainment', 'Other'],
    income: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other']
  };
  let items = []; // the single source of truth for all transactions

  // ---------- helpers ----------
  const pad = (n) => String(n).padStart(2, '0');
  // Dates are stored as "YYYY-MM-DD" text, which avoids time-zone surprises and sorts alphabetically.
  const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayString = () => toDateString(new Date());
  const currentMonthKey = () => todayString().slice(0, 7);
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const allCategories = () => [...new Set([...CATEGORIES.expense, ...CATEGORIES.income])].sort();
  const formatMoney = (n) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n);
  const formatDate = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // ---------- sample data ----------
  // Builds six months of realistic data, relative to today, so charts always look populated.
  function buildSampleData() {
    const now = new Date(), today = todayString(), list = [];
    const templates = [ // [type, category, description, amount, day of month]
      ['income', 'Salary', 'Monthly salary', 3200, 1], ['expense', 'Housing', 'Rent', 950, 2],
      ['expense', 'Utilities', 'Electricity and internet', 96, 6], ['expense', 'Groceries', 'Supermarket', 84.5, 8],
      ['expense', 'Subscriptions', 'Streaming and music', 22.98, 10], ['expense', 'Transport', 'Monthly transit pass', 49, 12],
      ['expense', 'Dining', 'Dinner with friends', 58.2, 15], ['expense', 'Groceries', 'Weekly groceries', 71.3, 18],
      ['expense', 'Shopping', 'Clothing', 64.9, 21], ['expense', 'Health', 'Pharmacy', 17.4, 24],
      ['income', 'Freelance', 'Website project', 450, 26]
    ];
    for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
      templates.forEach(([type, category, description, amount, day], i) => {
        if (category === 'Freelance' && monthsAgo % 2 === 1) return;            // freelance only some months
        const date = toDateString(new Date(now.getFullYear(), now.getMonth() - monthsAgo, day));
        if (date > today) return;                                               // no transactions in the future
        const fixed = description === 'Monthly salary' || description === 'Rent';
        const wobble = fixed ? 1 : 1 + (((monthsAgo * 7 + i * 3) % 9) - 4) / 50; // ±8% variation
        list.push({ id: newId(), type, category, description, amount: Math.round(amount * wobble * 100) / 100, date });
      });
    }
    return list;
  }

  // ---------- state ----------
  /** Loads saved data. Returns true if sample data was created (first visit). */
  function init() {
    const saved = Storage.loadTransactions();
    if (saved === null) { items = buildSampleData(); Storage.saveTransactions(items); return true; }
    items = saved;
    return false;
  }
  const persist = () => Storage.saveTransactions(items);
  const getAll = () => [...items].sort((a, b) => b.date.localeCompare(a.date)); // newest first (copy, so callers can't mutate state)
  const getById = (id) => items.find((t) => t.id === id);

  // ---------- validation ----------
  /** @returns {{errors: Object, clean: Object}} errors is empty when the input is valid. */
  function validate({ type, amount, category, description, date }) {
    const errors = {};
    const number = Number(amount);
    if (String(amount).trim() === '') errors.amount = 'Enter an amount.';
    else if (!Number.isFinite(number)) errors.amount = 'Amount must be a number.';
    else if (number <= 0) errors.amount = 'Amount must be greater than zero.';
    else if (number > 1e9) errors.amount = 'Amount is too large.';
    if (!CATEGORIES[type] || !CATEGORIES[type].includes(category)) errors.category = 'Select a category.';
    const text = String(description).trim();
    if (!text) errors.description = 'Add a short description.';
    else if (text.length > 80) errors.description = 'Keep the description under 80 characters.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) errors.date = 'Pick a valid date.';
    return { errors, clean: { type, amount: Math.round(number * 100) / 100, category, description: text, date } };
  }

  // ---------- create / update / delete ----------
  function add(data) { const tx = { id: newId(), ...data }; items.push(tx); persist(); return tx; }
  function update(id, data) {
    const index = items.findIndex((t) => t.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...data }; // keep id, overwrite changed fields
    persist(); return items[index];
  }
  function remove(id) { items = items.filter((t) => t.id !== id); persist(); }
  function clearAll() { items = []; persist(); }

  // ---------- filtering ----------
  /** Every filter is optional; an empty/"all" value means "don't filter on this". */
  function filter(list, { type = 'all', category = 'all', from = '', to = '', search = '' } = {}) {
    const query = search.trim().toLowerCase();
    return list.filter((t) =>
      (type === 'all' || t.type === type) &&
      (category === 'all' || t.category === category) &&
      (!from || t.date >= from) && (!to || t.date <= to) &&       // text dates compare correctly
      (!query || t.description.toLowerCase().includes(query)));
  }

  // ---------- calculations ----------
  const sum = (list) => list.reduce((total, t) => total + t.amount, 0);
  function summarize(list) {
    const income = sum(list.filter((t) => t.type === 'income'));
    const expenses = sum(list.filter((t) => t.type === 'expense'));
    return { income, expenses, balance: income - expenses };
  }
  const expensesForMonth = (list, monthKey) => sum(list.filter((t) => t.type === 'expense' && t.date.startsWith(monthKey)));

  /** One entry per month, oldest first, e.g. [{label:'Jun', income:3200, expenses:1500}, ...] */
  function monthlyTotals(list, months = 6) {
    const now = new Date(), result = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const inMonth = list.filter((t) => t.date.startsWith(key));
      const { income, expenses } = summarize(inMonth);
      result.push({ label: d.toLocaleString('en-GB', { month: 'short' }), income, expenses });
    }
    return result;
  }

  return { CATEGORIES, init, getAll, getById, validate, add, update, remove, clearAll, filter, summarize,
           expensesForMonth, monthlyTotals, allCategories, todayString, currentMonthKey, formatMoney, formatDate };
})();
