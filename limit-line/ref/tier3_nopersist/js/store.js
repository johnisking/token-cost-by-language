const KEY = 'ref_tx';
export const load = () => [];
export const save = items => localStorage.setItem(KEY, JSON.stringify(items));
