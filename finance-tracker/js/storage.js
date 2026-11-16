/* storage.js – the only file that talks to LocalStorage.
   Everything read from LocalStorage is treated as untrusted: it may be missing,
   corrupted, or edited by hand, so it is validated before the app uses it. */
const Storage = (() => {
  const KEYS = { transactions: 'ledgerly.transactions', budget: 'ledgerly.budget' };
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  // Checks that one stored object has the shape the app expects.
  function isValidTransaction(t) {
    return Boolean(t) && typeof t === 'object' &&
      typeof t.id === 'string' &&
      (t.type === 'income' || t.type === 'expense') &&
      typeof t.amount === 'number' && Number.isFinite(t.amount) && t.amount > 0 &&
      typeof t.category === 'string' && typeof t.description === 'string' &&
      DATE_PATTERN.test(t.date);
  }

  // Returns undefined when the key does not exist, null when the data is unreadable.
  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? undefined : JSON.parse(raw);
    } catch (error) {
      console.warn(`Could not read "${key}" from LocalStorage:`, error);
      return null;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) { // storage full, or blocked by the browser
      console.warn(`Could not save "${key}":`, error);
      return false;
    }
  }

  /** @returns {Array|null} null means "nothing saved yet" (first visit). */
  function loadTransactions() {
    const data = readJSON(KEYS.transactions);
    if (data === undefined) return null;
    if (!Array.isArray(data)) return [];       // corrupted: start clean
    return data.filter(isValidTransaction);    // drop any broken entries
  }

  function loadBudget() {
    const value = readJSON(KEYS.budget);
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  }

  const saveTransactions = (list) => writeJSON(KEYS.transactions, list);
  const saveBudget = (limit) => writeJSON(KEYS.budget, limit);
  const clearBudget = () => { try { localStorage.removeItem(KEYS.budget); } catch (e) { /* ignore */ } };

  function isAvailable() {
    try { localStorage.setItem('ledgerly.test', '1'); localStorage.removeItem('ledgerly.test'); return true; }
    catch (error) { return false; }
  }

  return { loadTransactions, saveTransactions, loadBudget, saveBudget, clearBudget, isAvailable };
})();
