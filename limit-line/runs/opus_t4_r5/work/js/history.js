// Undo/redo history of immutable states.

const MAX_UNDO = 50;

export function createHistory(initial) {
  let states = [initial];
  let index = 0;

  return {
    state: () => states[index],
    push(newState) {
      states = states.slice(0, index + 1);
      states.push(newState);
      if (states.length > MAX_UNDO + 1) states = states.slice(states.length - (MAX_UNDO + 1));
      index = states.length - 1;
      return newState;
    },
    undo() {
      if (index > 0) index--;
      return states[index];
    },
    redo() {
      if (index < states.length - 1) index++;
      return states[index];
    },
    canUndo: () => index > 0,
    canRedo: () => index < states.length - 1,
  };
}
