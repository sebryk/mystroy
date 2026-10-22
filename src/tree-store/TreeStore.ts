export type TreeId = string | number;

export type TreeItem = {
  id: TreeId;
  parent: TreeId | null;
};

export class TreeStore<TItem extends TreeItem> {
  private readonly itemsById = new Map<TreeId, TItem>();
  private readonly childIdsByParent = new Map<TreeId | null, Set<TreeId>>();
  private allItemsSnapshot: TItem[] | undefined;

  constructor(items: readonly TItem[]) {
    this.setItems(items);
  }

  setItems(items: readonly TItem[]): void {
    this.itemsById.clear();
    this.childIdsByParent.clear();
    this.allItemsSnapshot = undefined;

    for (const item of items) {
      this.addItem(item);
    }
  }

  addItem(item: TItem): void {
    this.itemsById.set(item.id, item);

    let childIds = this.childIdsByParent.get(item.parent);
    if (childIds === undefined) {
      childIds = new Set<TreeId>();
      this.childIdsByParent.set(item.parent, childIds);
    }

    childIds.add(item.id);
    this.allItemsSnapshot = undefined;
  }

  getAll(): TItem[] {
    if (this.allItemsSnapshot === undefined) {
      this.allItemsSnapshot = [...this.itemsById.values()];
    }

    return this.allItemsSnapshot;
  }

  getItem(id: TreeId): TItem | undefined {
    return this.itemsById.get(id);
  }

  getChildren(id: TreeId): TItem[] {
    const childIds = this.childIdsByParent.get(id);
    if (childIds === undefined) {
      return [];
    }

    const children: TItem[] = [];
    for (const childId of childIds) {
      const child = this.itemsById.get(childId);
      if (child !== undefined) {
        children.push(child);
      }
    }

    return children;
  }

  getAllChildren(id: TreeId): TItem[] {
    if (!this.itemsById.has(id)) {
      return [];
    }

    const descendants: TItem[] = [];
    const childIds = this.childIdsByParent.get(id);
    if (childIds === undefined) {
      return descendants;
    }

    for (const childId of childIds) {
      const child = this.itemsById.get(childId);
      if (child !== undefined) {
        descendants.push(child);
      }
    }

    for (let index = 0; index < descendants.length; index += 1) {
      const parent = descendants[index];
      if (parent === undefined) {
        continue;
      }

      const nestedChildIds = this.childIdsByParent.get(parent.id);
      if (nestedChildIds === undefined) {
        continue;
      }

      for (const childId of nestedChildIds) {
        const child = this.itemsById.get(childId);
        if (child !== undefined) {
          descendants.push(child);
        }
      }
    }

    return descendants;
  }

  getAllParents(id: TreeId): TItem[] {
    const parents: TItem[] = [];
    let current = this.itemsById.get(id);

    while (current !== undefined) {
      parents.push(current);
      if (current.parent === null) {
        break;
      }

      current = this.itemsById.get(current.parent);
    }

    return parents;
  }
}
