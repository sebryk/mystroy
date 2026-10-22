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
    for (const item of items) {
      this.itemsById.set(item.id, item);

      let childIds = this.childIdsByParent.get(item.parent);
      if (childIds === undefined) {
        childIds = new Set<TreeId>();
        this.childIdsByParent.set(item.parent, childIds);
      }

      childIds.add(item.id);
    }
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
}
