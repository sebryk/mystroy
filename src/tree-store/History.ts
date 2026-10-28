import { TreeStore, type TreeId, type TreeItem } from './TreeStore';

type Action = {
   undo: () => void;
   redo: () => void;
};

export class History<TItem extends TreeItem> extends TreeStore<TItem> {
   private undoStack: Action[] = [];
   private redoStack: Action[] = [];

   setItems(items: TItem[]): void {
      super.setItems([]);

      for (const item of items) {
         super.addItem(structuredClone(item));
      }

      if (this.undoStack) this.undoStack.length = 0;
      if (this.redoStack) this.redoStack.length = 0;
   }

   addItem(item: TItem): void {
      const saved = structuredClone(item);

      this.execute({
         undo: () => super.removeItem(saved.id),
         redo: () => super.addItem(structuredClone(saved)),
      });
   }

   removeItem(id: TreeId): void {
      const item = super.getItem(id);
      if (!item) return;

      const removed = structuredClone([item, ...super.getAllChildren(id)]);

      this.execute({
         undo: () => removed.forEach((item) => super.addItem(structuredClone(item))),
         redo: () => super.removeItem(id),
      });
   }

   updateItem(item: TItem): void {
      const current = super.getItem(item.id);
      if (!current) return;

      const before = structuredClone(current);
      const after = structuredClone(item);

      this.execute({
         undo: () => super.updateItem(structuredClone(before)),
         redo: () => super.updateItem(structuredClone(after)),
      });
   }

   undo(): void {
      const action = this.undoStack.pop();
      if (!action) return;

      action.undo();
      this.redoStack.push(action);
   }

   redo(): void {
      const action = this.redoStack.pop();
      if (!action) return;

      action.redo();
      this.undoStack.push(action);
   }

   private execute(action: Action): void {
      action.redo();
      this.undoStack.push(action);
      this.redoStack.length = 0;
   }
}
