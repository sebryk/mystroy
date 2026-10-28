// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref, shallowRef, type PropType } from 'vue';
import { History } from './tree-store/History';
import type { TreeDataItem } from './composables/useTreeItems';
import { useTreeItems } from './composables/useTreeItems';
import App from './App.vue';

vi.mock('./composables/useTreeItems', () => ({
   useTreeItems: vi.fn(),
}));

const TreeTableStub = defineComponent({
   name: 'TreeTable',
   props: {
      rows: { type: Array as PropType<TreeDataItem[]>, required: true },
      loading: { type: Boolean, required: true },
      addChild: { type: Function as PropType<(parentId: TreeDataItem['id']) => void>, required: true },
      removeItem: { type: Function as PropType<(id: TreeDataItem['id']) => void>, required: true },
   },
   setup(props) {
      return () =>
         h('div', {
            'data-tree-table': '',
            'data-loading': String(props.loading),
            'data-labels': props.rows.map((row) => row.label).join('|'),
         });
   },
});

const createState = () => ({
   store: new History<TreeDataItem>([]),
   rows: shallowRef<TreeDataItem[]>([]),
   loading: ref(true),
   error: ref<string | null>(null),
   load: vi.fn<() => Promise<void>>(),
   addChild: vi.fn<(parentId: TreeDataItem['id']) => void>(),
   removeItem: vi.fn<(id: TreeDataItem['id']) => void>(),
   undo: vi.fn<() => void>(),
   redo: vi.fn<() => void>(),
});

let state = createState();

const mountApp = () =>
   mount(App, {
      global: { stubs: { TreeTable: TreeTableStub } },
   });

beforeEach(() => {
   state = createState();
   state.load.mockResolvedValue(undefined);
   vi.mocked(useTreeItems).mockReturnValue(state);
});

describe('App', () => {
   it('loads once on mount and forwards reactive rows and loading state', async () => {
      const wrapper = mountApp();
      const table = wrapper.get('[data-tree-table]');

      expect(state.load).toHaveBeenCalledTimes(1);
      expect(wrapper.getComponent(TreeTableStub).props('addChild')).toBe(state.addChild);
      expect(wrapper.getComponent(TreeTableStub).props('removeItem')).toBe(state.removeItem);
      expect(table.attributes('data-loading')).toBe('true');
      expect(table.attributes('data-labels')).toBe('');

      state.rows.value = [{ id: 1, parent: null, label: 'Loaded item' }];
      state.loading.value = false;
      await nextTick();

      expect(table.attributes('data-loading')).toBe('false');
      expect(table.attributes('data-labels')).toBe('Loaded item');
   });

   it('shows the loader error in an alert and removes the table', () => {
      state.error.value = 'Не удалось загрузить данные: HTTP 503';
      const wrapper = mountApp();

      expect(wrapper.get('[role="alert"]').text()).toBe('Не удалось загрузить данные: HTTP 503');
      expect(wrapper.find('[data-tree-table]').exists()).toBe(false);
   });
});
