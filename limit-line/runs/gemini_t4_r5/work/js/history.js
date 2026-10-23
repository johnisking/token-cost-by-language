const MAX_UNDO = 50;

function clone(val) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(val);
    } catch {
      // fallback
    }
  }
  return val !== undefined ? JSON.parse(JSON.stringify(val)) : undefined;
}

export function createHistory(initial) {
  const undoStack = [];
  let current = clone(initial);
  let redoStack = [];

  return {
    state() {
      return clone(current);
    },
    push(newState) {
      undoStack.push(clone(current));
      if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
      }
      current = clone(newState);
      redoStack = [];
    },
    undo() {
      if (undoStack.length === 0) return clone(current);
      redoStack.push(clone(current));
      current = undoStack.pop();
      return clone(current);
    },
    redo() {
      if (redoStack.length === 0) return clone(current);
      undoStack.push(clone(current));
      if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
      }
      current = redoStack.pop();
      return clone(current);
    },
    canUndo() {
      return undoStack.length > 0;
    },
    canRedo() {
      return redoStack.length > 0;
    },
  };
}
