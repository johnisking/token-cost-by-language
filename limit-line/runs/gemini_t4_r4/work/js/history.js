const MAX_UNDO = 50;

export function createHistory(initial) {
  let past = [];
  let present = initial;
  let future = [];

  return {
    state() {
      return present;
    },
    push(newState) {
      past.push(present);
      if (past.length > MAX_UNDO) {
        past.shift();
      }
      present = newState;
      future = [];
    },
    undo() {
      if (past.length === 0) {
        return present;
      }
      future.push(present);
      present = past.pop();
      return present;
    },
    redo() {
      if (future.length === 0) {
        return present;
      }
      past.push(present);
      if (past.length > MAX_UNDO) {
        past.shift();
      }
      present = future.pop();
      return present;
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
  };
}
