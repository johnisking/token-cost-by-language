const MAX_UNDO = 50;

export function createHistory(initial) {
  let current = initial;
  let past = [];
  let future = [];
  return {
    state: () => current,
    push(newState) {
      past.push(current);
      if (past.length > MAX_UNDO) past.shift();
      current = newState;
      future = [];
    },
    undo() {
      if (past.length === 0) return current;
      future.push(current);
      current = past.pop();
      return current;
    },
    redo() {
      if (future.length === 0) return current;
      past.push(current);
      current = future.pop();
      return current;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
