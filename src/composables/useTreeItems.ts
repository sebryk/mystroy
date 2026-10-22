import { ref, shallowRef } from 'vue';
import { TreeStore, type TreeItem } from '../tree-store/TreeStore';

export type TreeDataItem = TreeItem & { label: string };

export const useTreeItems = () => {
   const store = new TreeStore<TreeDataItem>([]);
   const rows = shallowRef(store.getAll());
   const loading = ref(true);
   const error = ref<string | null>(null);

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

   return { store, rows, loading, error, load };
};
