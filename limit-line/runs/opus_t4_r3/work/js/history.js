const LIMIT = 50;

export function createHistory(initial) {
  let past = [];
  let present = initial;
  let future = [];
  return {
    state: () => present,
    push(newState) {
      past.push(present);
      if (past.length > LIMIT) past = past.slice(past.length - LIMIT);
      present = newState;
      future = [];
      return present;
    },
    undo() {
      if (past.length) {
        future.push(present);
        present = past.pop();
      }
      return present;
    },
    redo() {
      if (future.length) {
        past.push(present);
        present = future.pop();
      }
      return present;
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
