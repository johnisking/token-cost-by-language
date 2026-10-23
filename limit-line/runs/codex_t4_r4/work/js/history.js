const copy = value => structuredClone(value);

export function createHistory(initial) {
  let past = [], present = copy(initial), future = [];
  return {
    state: () => copy(present),
    push(newState) {
      past.push(present);
      if (past.length > 50) past.shift();
      present = copy(newState);
      future = [];
      return copy(present);
    },
    undo() {
      if (!past.length) return copy(present);
      future.push(present);
      present = past.pop();
      return copy(present);
    },
    redo() {
      if (!future.length) return copy(present);
      past.push(present);
      present = future.pop();
      return copy(present);
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0
  };
}
