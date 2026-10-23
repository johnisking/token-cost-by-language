const KEY = 'ref_tx';
export const load = () => JSON.parse(localStorage.getItem(KEY) || '[]');
export const save = items => localStorage.setItem(KEY, JSON.stringify(items));
