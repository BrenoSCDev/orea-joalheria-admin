/** Helpers to work with the flat category list (id + parent_id) returned by the API. */
export interface TreeInput {
  id: number;
  parent_id: number | null;
  name: string;
  sort_order?: number;
}

export type TreeNode<T extends TreeInput> = T & { depth: number; path: string[]; children: TreeNode<T>[] };

/** Builds the tree; orphans (parent missing) become roots. Siblings: sort_order, then name. */
export function buildTree<T extends TreeInput>(items: T[]): TreeNode<T>[] {
  const nodes = new Map<number, TreeNode<T>>();
  items.forEach((item) => nodes.set(item.id, { ...item, depth: 0, path: [], children: [] }));
  const roots: TreeNode<T>[] = [];
  nodes.forEach((node) => {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    (parent ? parent.children : roots).push(node);
  });
  const sort = (list: TreeNode<T>[], depth: number, path: string[]) => {
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, "pt-BR"));
    list.forEach((n) => {
      n.depth = depth;
      n.path = [...path, n.name];
      sort(n.children, depth + 1, n.path);
    });
  };
  sort(roots, 0, []);
  return roots;
}

/** Depth-first flat list (tree order), handy for indented selects and lists. */
export function flattenTree<T extends TreeInput>(roots: TreeNode<T>[]): TreeNode<T>[] {
  const out: TreeNode<T>[] = [];
  const walk = (list: TreeNode<T>[]) => list.forEach((n) => (out.push(n), walk(n.children)));
  walk(roots);
  return out;
}

/** Ids of a node and all its descendants. */
export function descendantIds<T extends TreeInput>(node: TreeNode<T>): number[] {
  return [node.id, ...node.children.flatMap((c) => descendantIds(c))];
}

/** Root → … → category, for categories embedded with nested `parent`. */
export function categoryChain<C extends { parent?: C | null }>(category: C | null | undefined): C[] {
  const chain: C[] = [];
  let node = category ?? null;
  let guard = 0;
  while (node && guard++ < 10) {
    chain.unshift(node);
    node = node.parent ?? null;
  }
  return chain;
}
