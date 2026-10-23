const MAX_UNDO = 50;

function clone(val) {
  if (val === undefined || val === null || typeof val !== 'object') {
    return val;
  }
  return structuredClone ? structuredClone(val) : JSON.parse(JSON.stringify(val));
}

export function createHistory(initial) {
  const past = [];
  let current = clone(initial);
  let future = [];

  return {
    state() {
      return clone(current);
    },
    push(newState) {
      past.push(clone(current));
      if (past.length > MAX_UNDO) {
        past.shift();
      }
      current = clone(newState);
      future = [];
    },
    undo() {
      if (past.length === 0) {
        return clone(current);
      }
      future.push(clone(current));
      current = past.pop();
      return clone(current);
    },
    redo() {
      if (future.length === 0) {
        return clone(current);
      }
      past.push(clone(current));
      if (past.length > MAX_UNDO) {
        past.shift();
      }
      current = future.pop();
      return clone(current);
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
  };
}
