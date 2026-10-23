export function createHistory(initial) {
  const copy = value => structuredClone(value);
  let past = [], present = copy(initial), future = [];
  return {
    state: () => copy(present),
    push(newState) { past.push(present); if (past.length > 50) past.shift(); present = copy(newState); future = []; },
    undo() { if (!past.length) return this.state(); future.push(present); present = past.pop(); return this.state(); },
    redo() { if (!future.length) return this.state(); past.push(present); present = future.pop(); return this.state(); },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0
  };
}
