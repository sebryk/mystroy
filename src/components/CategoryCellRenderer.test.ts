// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { ICellRendererParams } from 'ag-grid-community';
import type { TreeDataItem } from '../composables/useTreeItems';
import type { TreeId } from '../tree-store/TreeStore';
import CategoryCellRenderer from './CategoryCellRenderer.vue';

type RendererParams = ICellRendererParams<TreeDataItem> & {
   onAddChild: (id: TreeId) => void;
   onRemove: (id: TreeId) => void;
};

const createParams = (data: TreeDataItem | undefined, value: string): RendererParams =>
   ({
      data,
      value,
      onAddChild: vi.fn(),
      onRemove: vi.fn(),
   }) as unknown as RendererParams;

describe('CategoryCellRenderer', () => {
   it('shows the category and routes button clicks without bubbling them to the group cell', async () => {
      const params = createParams({ id: 'row-1', parent: null, label: 'Row' }, 'Группа');
      const parentEvent = vi.fn();
      const wrapper = mount(
         defineComponent({
            setup: () => () =>
               h('div', {
                  onClick: parentEvent,
                  onMousedown: parentEvent,
                  onDblclick: parentEvent,
                  onTouchstart: parentEvent,
                  onKeydown: parentEvent,
                  onKeyup: parentEvent,
               }, [h(CategoryCellRenderer, { params })]),
         }),
      );

      expect(wrapper.text()).toContain('Группа');
      const addButton = wrapper.get('button[aria-label="Добавить дочерний элемент"]');
      const removeButton = wrapper.get('button[aria-label="Удалить строку и потомков"]');

      await addButton.trigger('click');
      await removeButton.trigger('click');
      for (const button of [addButton, removeButton]) {
         await button.trigger('mousedown');
         await button.trigger('dblclick');
         await button.trigger('touchstart');
         await button.trigger('keydown', { key: 'Enter' });
         await button.trigger('keyup', { key: 'Enter' });
         await button.trigger('keydown', { key: ' ' });
         await button.trigger('keyup', { key: ' ' });
      }

      expect(params.onAddChild).toHaveBeenCalledExactlyOnceWith('row-1');
      expect(params.onRemove).toHaveBeenCalledExactlyOnceWith('row-1');
      expect(parentEvent).not.toHaveBeenCalled();
      expect(addButton.attributes('type')).toBe('button');
      expect(removeButton.attributes('type')).toBe('button');
   });

   it('renders the element label and disables actions when row data is absent', () => {
      const wrapper = mount(CategoryCellRenderer, {
         props: { params: createParams(undefined, 'Элемент') },
      });

      expect(wrapper.text()).toContain('Элемент');
      expect(wrapper.get('button[aria-label="Добавить дочерний элемент"]').attributes('disabled')).toBeDefined();
      expect(wrapper.get('button[aria-label="Удалить строку и потомков"]').attributes('disabled')).toBeDefined();
   });
});
