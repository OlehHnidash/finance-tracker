/* app.js – wires everything together: events, form handling, list rendering. */
(() => {
  const $ = (id) => document.getElementById(id);
  const state = { editingId: null, budget: null };
  const els = {
    form: $('tx-form'), amount: $('tx-amount'), category: $('tx-category'), description: $('tx-description'),
    date: $('tx-date'), list: $('tx-list'), filters: ['filter-search', 'filter-type', 'filter-category', 'filter-from', 'filter-to']
  };

  // ---------- small UI helpers ----------
  let toastTimer;
  function showToast(message, isError = false) {
    const toast = $('toast');
    toast.textContent = message; toast.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // Resolves to true/false depending on which dialog button was pressed.
  function confirmAction({ title, message, confirmLabel }) {
    return new Promise((resolve) => {
      const dialog = $('confirm-dialog');
      $('confirm-title').textContent = title; $('confirm-message').textContent = message;
      $('confirm-ok').textContent = confirmLabel;
      dialog.returnValue = '';
      dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
      dialog.showModal();
    });
  }

  function showFieldErrors(errors) {
    document.querySelectorAll('[data-error]').forEach((el) => { el.textContent = errors[el.dataset.error] || ''; });
    const inputs = { amount: els.amount, category: els.category, description: els.description, date: els.date };
    Object.entries(inputs).forEach(([name, input]) => input.classList.toggle('invalid', Boolean(errors[name])));
  }

  // ---------- form ----------
  const selectedType = () => els.form.elements.type.value;

  function fillOptions(select, categories, placeholder) {
    select.replaceChildren(new Option(placeholder, ''));
    categories.forEach((name) => select.add(new Option(name, name)));
  }

  function resetForm() {
    state.editingId = null;
    els.form.reset(); // restores defaults (expense selected)
    els.date.value = Transactions.todayString();
    fillOptions(els.category, Transactions.CATEGORIES.expense, 'Select a category');
    showFieldErrors({});
    $('form-title').textContent = 'Add transaction';
    $('submit-btn').textContent = 'Add transaction';
    $('cancel-edit').hidden = true;
  }

  function startEditing(id) {
    const tx = Transactions.getById(id);
    if (!tx) return;
    state.editingId = id;
    els.form.elements.type.value = tx.type;
    fillOptions(els.category, Transactions.CATEGORIES[tx.type], 'Select a category'); // must happen before setting category
    els.category.value = tx.category;
    els.amount.value = tx.amount; els.description.value = tx.description; els.date.value = tx.date;
    showFieldErrors({});
    $('form-title').textContent = 'Edit transaction';
    $('submit-btn').textContent = 'Save changes';
    $('cancel-edit').hidden = false;
    $('form-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    els.amount.focus();
  }

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    const { errors, clean } = Transactions.validate({
      type: selectedType(), amount: els.amount.value, category: els.category.value,
      description: els.description.value, date: els.date.value
    });
    showFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (state.editingId) { Transactions.update(state.editingId, clean); showToast('Transaction updated'); }
    else { Transactions.add(clean); showToast('Transaction added'); }
    resetForm();
    renderAll();
  }

  // ---------- budget ----------
  function handleBudgetSubmit(event) {
    event.preventDefault();
    const raw = $('budget-input').value, value = Number(raw);
    const error = $('budget-error');
    if (raw.trim() === '' || !Number.isFinite(value) || value <= 0) { error.textContent = 'Enter a limit greater than zero.'; return; }
    if (value > 1e9) { error.textContent = 'That limit is too large.'; return; }
    error.textContent = '';
    state.budget = Math.round(value * 100) / 100;
    Storage.saveBudget(state.budget);
    showToast('Budget saved');
    renderAll();
  }

  // ---------- transaction list ----------
  const readFilters = () => ({
    search: $('filter-search').value, type: $('filter-type').value, category: $('filter-category').value,
    from: $('filter-from').value, to: $('filter-to').value
  });

  function buildRow(tx) {
    const li = document.createElement('li'); li.className = 'tx';
    const make = (tag, className, text) => { const el = document.createElement(tag); el.className = className; if (text !== undefined) el.textContent = text; return el; };

    const icon = make('div', `tx-icon ${tx.type}`, tx.type === 'income' ? '+' : '−');
    const info = make('div', 'tx-info');
    // textContent (not innerHTML) so a description like "<script>" is shown as text, never run
    const meta = make('div', 'tx-meta'); meta.append(make('span', 'chip', tx.category), make('span', '', Transactions.formatDate(tx.date)));
    info.append(make('div', 'tx-title', tx.description), meta);
    const sign = tx.type === 'income' ? '+' : '−';
    const amount = make('div', `tx-amount ${tx.type === 'income' ? 'positive' : 'negative'}`, sign + Transactions.formatMoney(tx.amount));

    const actions = make('div', 'tx-actions');
    [['edit', 'Edit'], ['delete', 'Delete']].forEach(([action, label]) => {
      const button = make('button', '', label); button.type = 'button';
      button.dataset.action = action; button.dataset.id = tx.id;
      button.setAttribute('aria-label', `${label} ${tx.description}`);
      actions.append(button);
    });
    li.append(icon, info, amount, actions);
    return li;
  }

  function renderList() {
    const all = Transactions.getAll();
    const visible = Transactions.filter(all, readFilters());
    els.list.replaceChildren(...visible.map(buildRow));

    const empty = visible.length === 0;
    $('empty-state').hidden = !empty;
    $('result-count').textContent = all.length ? `Showing ${visible.length} of ${all.length} transactions` : '';
    if (empty) {
      const noData = all.length === 0;
      $('empty-title').textContent = noData ? 'No transactions yet' : 'No matching transactions';
      $('empty-text').textContent = noData ? 'Add your first income or expense using the form.' : 'Try changing or resetting the filters.';
    }
  }

  function renderAll() {
    Dashboard.render(Transactions.getAll(), state.budget);
    renderList();
  }

  // ---------- events ----------
  function bindEvents() {
    els.form.addEventListener('submit', handleSubmit);
    els.form.elements.type.forEach((radio) => radio.addEventListener('change', () => {
      fillOptions(els.category, Transactions.CATEGORIES[selectedType()], 'Select a category');
    }));
    $('cancel-edit').addEventListener('click', resetForm);
    $('budget-form').addEventListener('submit', handleBudgetSubmit);

    els.filters.forEach((id) => $(id).addEventListener('input', renderList));
    $('filter-reset').addEventListener('click', () => {
      els.filters.forEach((id) => { $(id).value = id === 'filter-type' || id === 'filter-category' ? 'all' : ''; });
      renderList();
    });

    // Event delegation: one listener on the list handles every Edit/Delete button, even ones added later.
    els.list.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { action, id } = button.dataset;
      if (action === 'edit') return startEditing(id);
      const tx = Transactions.getById(id);
      const ok = await confirmAction({ title: 'Delete transaction?', message: `"${tx.description}" will be removed permanently.`, confirmLabel: 'Delete' });
      if (!ok) return;
      Transactions.remove(id);
      if (state.editingId === id) resetForm();
      showToast('Transaction deleted'); renderAll();
    });

    $('clear-data').addEventListener('click', async () => {
      const ok = await confirmAction({ title: 'Clear all data?', message: 'This deletes every transaction and your budget. It cannot be undone.', confirmLabel: 'Clear everything' });
      if (!ok) return;
      Transactions.clearAll(); Storage.clearBudget(); state.budget = null;
      resetForm(); renderAll(); showToast('All data cleared');
    });
  }

  // ---------- start-up ----------
  function init() {
    const seeded = Transactions.init();
    if (seeded) Storage.saveBudget(1500); // sample budget so the warning feature is visible on first run
    state.budget = Storage.loadBudget();

    fillOptions($('filter-category'), Transactions.allCategories(), 'All categories');
    $('filter-category').firstElementChild.value = 'all';
    resetForm(); bindEvents(); renderAll();
    if (!Storage.isAvailable()) showToast('Browser storage is blocked: changes will not be saved.', true);
  }
  init();
})();
