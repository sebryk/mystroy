// @vitest-environment happy-dom

import { mount } from '@vue/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { TreeDataItem } from '../composables/useTreeItems';
import TreeTable from './TreeTable.vue';

const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
const mountedWrappers: Array<{ unmount: () => void }> = [];

beforeAll(() => {
   Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 900 });
   Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
});

afterAll(() => {
   if (originalClientWidth === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
   } else {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
   }
   if (originalClientHeight === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
   } else {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
   }
});

afterEach(() => {
   mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
   document.body.innerHTML = '';
});

const rowSelector = (id: string): string => `.ag-row[row-id="string:${id}"]`;
const categorySelector = (id: string): string => `${rowSelector(id)} .ag-cell[col-id="category"]`;

const mountTree = (initialRows: TreeDataItem[]) => {
   const wrapper = mount(TreeTable, {
      attachTo: document.body,
      props: {
         rows: initialRows,
         loading: false,
         addChild: vi.fn(),
         removeItem: vi.fn(),
      },
   });
   mountedWrappers.push(wrapper);

   return {
      updateRows: async (rows: TreeDataItem[]) => {
         await wrapper.setProps({ rows });
         await nextTick();
      },
   };
};

const waitForRow = async (id: string): Promise<HTMLElement> => {
   await vi.waitFor(() => expect(document.querySelector(rowSelector(id))).not.toBeNull());
   const row = document.querySelector<HTMLElement>(rowSelector(id));
   if (row === null) {
      throw new Error(`Missing rendered row ${id}`);
   }
   return row;
};

const waitForCategoryRenderer = async (id: string): Promise<HTMLElement> => {
   await vi.waitFor(() => expect(document.querySelector(`${categorySelector(id)} .category-cell-renderer`)).not.toBeNull());
   const renderer = document.querySelector<HTMLElement>(`${categorySelector(id)} .category-cell-renderer`);
   if (renderer === null) {
      throw new Error(`Missing category renderer in row ${id}`);
   }
   return renderer;
};

const clickButton = async (id: string, action: 'Добавить дочерний элемент' | 'Удалить строку и потомков') => {
   const row = await waitForRow(id);
   await vi.waitFor(() => expect(row.querySelector(`button[aria-label="${action}"]`)).not.toBeNull());
   const button = row.querySelector<HTMLButtonElement>(`button[aria-label="${action}"]`);
   if (button === null) throw new Error(`Missing ${action} button in row ${id}`);
   button.click();
   await nextTick();
};

const dispatchTab = (target: HTMLElement, shiftKey = false): KeyboardEvent => {
   const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
      shiftKey,
   });
   target.dispatchEvent(event);
   return event;
};

describe('TreeTable with AG Grid', () => {
   it('expands the target collapsed group after adding a child and preserves other collapsed groups', async () => {
      const initialRows: TreeDataItem[] = [
         { id: 'group-a', parent: null, label: 'Group A' },
         { id: 'child-a', parent: 'group-a', label: 'Child A' },
         { id: 'group-b', parent: null, label: 'Group B' },
         { id: 'child-b', parent: 'group-b', label: 'Child B' },
      ];
      const { updateRows } = mountTree(initialRows);

      await waitForRow('child-a');
      const groupA = await waitForRow('group-a');
      const groupB = await waitForRow('group-b');
      await waitForCategoryRenderer('group-a');
      await waitForCategoryRenderer('group-b');
      await vi.waitFor(() => expect(groupA.querySelector('.ag-group-expanded')).not.toBeNull());
      await vi.waitFor(() => expect(groupB.querySelector('.ag-group-expanded')).not.toBeNull());
      groupA.querySelector<HTMLElement>('.ag-group-expanded')?.click();
      groupB.querySelector<HTMLElement>('.ag-group-expanded')?.click();
      await vi.waitFor(() => expect(document.querySelector(rowSelector('child-a'))).toBeNull());
      await vi.waitFor(() => expect(document.querySelector(rowSelector('child-b'))).toBeNull());

      await clickButton('group-a', 'Добавить дочерний элемент');
      await updateRows([
         ...initialRows,
         { id: 'added-1', parent: 'group-a', label: 'Новый элемент' },
      ]);

      await waitForRow('added-1');
      const updatedGroupA = await waitForRow('group-a');
      const updatedGroupB = await waitForRow('group-b');
      expect(updatedGroupA.querySelector('.ag-group-expanded')).not.toBeNull();
      expect(document.querySelector(rowSelector('child-b'))).toBeNull();
      expect(updatedGroupB.querySelector('.ag-group-contracted')).not.toBeNull();
   });

   it('moves Tab and Shift+Tab through category actions and then returns navigation to the grid', async () => {
      mountTree([
         { id: 'keyboard-row', parent: null, label: 'Keyboard row' },
      ]);
      await waitForRow('keyboard-row');
      const category = document.querySelector<HTMLElement>(categorySelector('keyboard-row'));
      const row = await waitForRow('keyboard-row');
      await waitForCategoryRenderer('keyboard-row');
      const addButton = row.querySelector<HTMLButtonElement>('button[aria-label="Добавить дочерний элемент"]');
      const removeButton = row.querySelector<HTMLButtonElement>('button[aria-label="Удалить строку и потомков"]');
      const labelCell = row.querySelector<HTMLElement>('.ag-cell[col-id="label"]');
      const numberCell = row.querySelector<HTMLElement>('.ag-cell[col-id="rowNumber"]');

      expect(category).not.toBeNull();
      expect(addButton).not.toBeNull();
      expect(removeButton).not.toBeNull();
      expect(labelCell).not.toBeNull();
      expect(numberCell).not.toBeNull();

      category?.focus();
      expect(dispatchTab(category as HTMLElement).defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(addButton);
      expect(dispatchTab(addButton as HTMLButtonElement).defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(removeButton);
      dispatchTab(removeButton as HTMLButtonElement);
      expect(document.activeElement).toBe(row.querySelector('.ag-cell[col-id="label"]'));

      category?.focus();
      expect(dispatchTab(category as HTMLElement, true).defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(removeButton);
      expect(dispatchTab(removeButton as HTMLButtonElement, true).defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(addButton);
      dispatchTab(addButton as HTMLButtonElement, true);
      expect(document.activeElement).toBe(row.querySelector('.ag-cell[col-id="rowNumber"]'));
   });

   it('keeps Enter and Space on action buttons from toggling groups while preserving row Enter behavior', async () => {
      const initialRows: TreeDataItem[] = [
         { id: 'keyboard-group', parent: null, label: 'Keyboard group' },
         { id: 'keyboard-child', parent: 'keyboard-group', label: 'Keyboard child' },
      ];
      const { updateRows } = mountTree(initialRows);
      const group = await waitForRow('keyboard-group');
      await waitForCategoryRenderer('keyboard-group');
      await vi.waitFor(() => expect(group.querySelector('.ag-group-expanded')).not.toBeNull());
      group.querySelector<HTMLElement>('.ag-group-expanded')?.click();
      await vi.waitFor(() => expect(document.querySelector(rowSelector('keyboard-child'))).toBeNull());

      const addButton = group.querySelector<HTMLButtonElement>('button[aria-label="Добавить дочерний элемент"]');
      expect(addButton).not.toBeNull();
      addButton?.focus();
      const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      addButton?.dispatchEvent(enter);
      expect(enter.defaultPrevented).toBe(false);
      const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      addButton?.dispatchEvent(space);
      expect(space.defaultPrevented).toBe(false);
      expect(document.querySelector(rowSelector('keyboard-child'))).toBeNull();

      const category = group.querySelector<HTMLElement>('.ag-cell[col-id="category"]');
      category?.focus();
      category?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      await vi.waitFor(() => expect(document.querySelector(rowSelector('keyboard-child'))).not.toBeNull());

      await clickButton('keyboard-group', 'Добавить дочерний элемент');
      await updateRows([
         ...initialRows,
         { id: 'added-1', parent: 'keyboard-group', label: 'Новый элемент' },
      ]);
      expect(document.querySelector(rowSelector('added-1'))).not.toBeNull();
   });

   it('updates category from Element to Group and back when the last child is removed', async () => {
      const initialRows: TreeDataItem[] = [
         { id: 'single-row', parent: null, label: 'Single row' },
      ];
      const { updateRows } = mountTree(initialRows);
      await waitForRow('single-row');
      await waitForCategoryRenderer('single-row');
      expect(document.querySelector(`${categorySelector('single-row')} .category-label`)?.textContent).toBe('Элемент');

      await clickButton('single-row', 'Добавить дочерний элемент');
      await updateRows([
         ...initialRows,
         { id: 'added-1', parent: 'single-row', label: 'Новый элемент' },
      ]);
      await waitForRow('added-1');
      await vi.waitFor(() =>
         expect(document.querySelector(`${categorySelector('single-row')} .category-label`)?.textContent).toBe('Группа'),
      );
      expect(document.querySelector(categorySelector('single-row'))?.getAttribute('style')).toContain('font-weight: 700');
      expect(document.querySelector(`${rowSelector('added-1')} .number-cell`)?.textContent).toBe('2');

      await clickButton('added-1', 'Удалить строку и потомков');
      await updateRows(initialRows);
      await vi.waitFor(() =>
         expect(document.querySelector(`${categorySelector('single-row')} .category-label`)?.textContent).toBe('Элемент'),
      );
      expect(document.querySelector(categorySelector('single-row'))?.getAttribute('style')).toContain('font-weight: 400');
      expect(document.querySelector(rowSelector('added-1'))).toBeNull();
   });
});
