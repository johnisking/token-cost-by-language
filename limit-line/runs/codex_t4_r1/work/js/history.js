export function createHistory(initial) {
  let past = [], present = initial, future = [];
  return {
    state: () => present,
    push(newState) {
      past.push(present);
      if (past.length > 50) past.shift();
      present = newState; future = [];
      return present;
    },
    undo() {
      if (!past.length) return present;
      future.unshift(present); present = past.pop(); return present;
    },
    redo() {
      if (!future.length) return present;
      past.push(present); present = future.shift(); return present;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0
  };
}
