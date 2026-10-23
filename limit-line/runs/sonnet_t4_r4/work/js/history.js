const MAX_UNDO = 50;

export function createHistory(initial) {
  let present = initial;
  let past = [];
  let future = [];
  return {
    state: () => present,
    push(newState) {
      past.push(present);
      if (past.length > MAX_UNDO) past.shift();
      present = newState;
      future = [];
    },
    undo() {
      if (!past.length) return present;
      future.push(present);
      present = past.pop();
      return present;
    },
    redo() {
      if (!future.length) return present;
      past.push(present);
      present = future.pop();
      return present;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
