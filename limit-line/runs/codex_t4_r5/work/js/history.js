export function createHistory(initial) {
  const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  let past = [], present = clone(initial), future = [];
  return {
    state: () => clone(present),
    push(newState) {
      past.push(present);
      if (past.length > 50) past.shift();
      present = clone(newState); future = [];
      return clone(present);
    },
    undo() {
      if (!past.length) return clone(present);
      future.unshift(present); present = past.pop();
      return clone(present);
    },
    redo() {
      if (!future.length) return clone(present);
      past.push(present); present = future.shift();
      return clone(present);
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0
  };
}
