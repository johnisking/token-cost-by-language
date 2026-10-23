// Undo/redo stack for a single value. Keeps at most 50 undo steps.

const MAX_UNDO = 50;

export function createHistory(initial) {
  let stack = [initial];
  let index = 0;

  return {
    state() {
      return stack[index];
    },

    push(newState) {
      // A new change discards any redo steps.
      stack = stack.slice(0, index + 1);
      stack.push(newState);
      if (stack.length > MAX_UNDO + 1) stack.shift();
      index = stack.length - 1;
    },

    undo() {
      if (index > 0) index--;
      return stack[index];
    },

    redo() {
      if (index < stack.length - 1) index++;
      return stack[index];
    },

    canUndo() {
      return index > 0;
    },

    canRedo() {
      return index < stack.length - 1;
    },
  };
}
