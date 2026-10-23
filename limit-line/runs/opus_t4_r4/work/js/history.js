const MAX_UNDO = 50;

export function createHistory(initial) {
  let past = [];
  let present = initial;
  let future = [];
  return {
    state: () => present,
    push(newState) {
      past.push(present);
      if (past.length > MAX_UNDO) past = past.slice(past.length - MAX_UNDO);
      present = newState;
      future = [];
    },
    undo() {
      if (past.length) { future.push(present); present = past.pop(); }
      return present;
    },
    redo() {
      if (future.length) { past.push(present); present = future.pop(); }
      return present;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
