const copy = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export function createHistory(initial) {
  let past = [], current = copy(initial), future = [];
  return {
    state: () => copy(current),
    push(newState) {
      past.push(current);
      if (past.length > 50) past.shift();
      current = copy(newState); future = [];
    },
    undo() {
      if (!past.length) return this.state();
      future.unshift(current); current = past.pop(); return this.state();
    },
    redo() {
      if (!future.length) return this.state();
      past.push(current); current = future.shift(); return this.state();
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0
  };
}
