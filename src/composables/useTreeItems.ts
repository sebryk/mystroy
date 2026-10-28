import { ref, shallowRef } from 'vue';
import { History } from '../tree-store/History';
import { type TreeId, type TreeItem } from '../tree-store/TreeStore';

export type TreeDataItem = TreeItem & { label: string };

export const useTreeItems = () => {
   const store = new History<TreeDataItem>([]);
   const rows = shallowRef(store.getAll());
   const loading = ref(true);
   const error = ref<string | null>(null);

   const addChild = (parentId: TreeId): void => {
      if (store.getItem(parentId) === undefined) {
         return;
      }

      store.addItem({ id: crypto.randomUUID(), parent: parentId, label: 'Новый элемент' });
      rows.value = store.getAll();
   };

   const removeItem = (id: TreeId): void => {
      if (store.getItem(id) === undefined) {
         return;
      }

      store.removeItem(id);
      rows.value = store.getAll();
   };

   const undo = (): void => {
      store.undo();
      rows.value = store.getAll();
   };

   const redo = (): void => {
      store.redo();
      rows.value = store.getAll();
   };

   const load = async () => {
      loading.value = true;
      error.value = null;

      try {
         const response = await fetch('/items.json');

         if (!response.ok) {
            throw new Error(`Не удалось загрузить данные: HTTP ${response.status}`);
         }

         const items: TreeDataItem[] = await response.json();

         await new Promise<void>((resolve) => setTimeout(resolve, 2000));

         store.setItems(items);
         rows.value = store.getAll();
      } catch (cause) {
         error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить данные.';
      } finally {
         loading.value = false;
      }
   };

   return { store, rows, loading, error, load, addChild, removeItem, undo, redo };
};
