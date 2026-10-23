export function createHistory(initial) { let past = [], cur = initial, fut = [];
  return { state: () => cur, push(s) { past.push(cur); if (past.length > 50) past.shift(); cur = s; fut = []; },
    undo() { if (past.length) { fut.push(cur); cur = past.pop(); } return cur; }, redo() { if (fut.length) { past.push(cur); cur = fut.pop(); } return cur; },
    canUndo: () => past.length > 0, canRedo: () => fut.length > 0 }; }
