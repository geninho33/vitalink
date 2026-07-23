/**
 * Monta árvore de menus a partir da lista plana de /menus/me.
 */
export function buildMenuTree(menus = []) {
  const byId = new Map();
  const roots = [];

  menus.forEach((m) => {
    byId.set(m.id, { ...m, children: [] });
  });

  byId.forEach((node) => {
    if (node.menuPaiId && byId.has(node.menuPaiId)) {
      byId.get(node.menuPaiId).children.push(node);
    } else if (!node.menuPaiId) {
      roots.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortFn = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0);
  const sortTree = (nodes) => {
    nodes.sort(sortFn);
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(roots);
  return roots;
}

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'VL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
