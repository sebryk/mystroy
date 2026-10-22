// @vitest-environment happy-dom

import { CellStyleModule, ClientSideRowModelModule, LocaleModule, RenderApiModule } from 'ag-grid-community';
import { TreeDataModule } from 'ag-grid-enterprise';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import type { TreeDataItem } from '../composables/useTreeItems';
import TreeTable from './TreeTable.vue';

type GridProps = Record<string, unknown>;

let gridProps: GridProps = {};

const AgGridStub = defineComponent({
   name: 'AgGridVue',
   inheritAttrs: false,
   setup(_props, { attrs }) {
      gridProps = attrs;
      return () => h('div');
   },
});

const mountTable = (rows: readonly TreeDataItem[], loading: boolean) =>
   mount(TreeTable, {
      props: { rows, loading },
      global: { stubs: { AgGridVue: AgGridStub } },
   });

const isRecord = (value: unknown): value is GridProps => typeof value === 'object' && value !== null;

const gridProp = (name: string): unknown => {
   const kebabName = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
   return gridProps[name] ?? gridProps[kebabName];
};

const getColumns = (): GridProps[] => {
   const value = gridProp('columnDefs');
   if (!Array.isArray(value)) {
      throw new Error('Expected AgGrid column definitions');
   }

   return value.filter(isRecord);
};

const getColumn = (colId: string): GridProps => {
   const column = getColumns().find((candidate) => candidate.colId === colId);
   if (column === undefined) {
      throw new Error(`Missing ${colId} column`);
   }

   return column;
};

const invoke = (callback: unknown, params: unknown): unknown => {
   if (typeof callback !== 'function') {
      throw new Error('Expected a configured grid callback');
   }

   return Reflect.apply(callback, undefined, [params]);
};

beforeEach(() => {
   gridProps = {};
});

describe('TreeTable', () => {
   it('adapts typed parent IDs while preserving input rows and order', async () => {
      const numberRoot: TreeDataItem = { id: 1, parent: null, label: 'Number' };
      const stringRoot: TreeDataItem = { id: '1', parent: null, label: 'String' };
      const numberChild: TreeDataItem = {
         id: 'number-child',
         parent: 1,
         label: 'Child of number',
      };
      const stringChild: TreeDataItem = {
         id: 'string-child',
         parent: '1',
         label: 'Child of string',
      };
      const originalRows = [numberRoot, stringRoot, numberChild, stringChild];
      const originalRowsSnapshot = originalRows.map((row) => ({ ...row }));
      const wrapper = mountTable(originalRows, true);

      expect(gridProp('rowData')).toEqual([
         { ...numberRoot, parentRowId: null },
         { ...stringRoot, parentRowId: null },
         { ...numberChild, parentRowId: 'number:1' },
         { ...stringChild, parentRowId: 'string:1' },
      ]);
      expect(gridProp('getRowId')).toBeTypeOf('function');
      expect(
         invoke(gridProp('getRowId'), {
            data: { ...numberRoot, parentRowId: null },
         }),
      ).toBe('number:1');
      expect(
         invoke(gridProp('getRowId'), {
            data: { ...stringRoot, parentRowId: null },
         }),
      ).toBe('string:1');
      expect(originalRows).toEqual(originalRowsSnapshot);
      expect(gridProp('loading')).toBe(true);

      await wrapper.setProps({
         rows: [{ id: 3, parent: null, label: 'Updated' }],
         loading: false,
      });

      expect(gridProp('rowData')).toEqual([{ id: 3, parent: null, label: 'Updated', parentRowId: null }]);
      expect(gridProp('loading')).toBe(false);
   });

   it('configures the three reference columns and minimal expanded tree grid', () => {
      mountTable([], false);
      const columns = getColumns();

      expect(columns.map(({ colId, headerName }) => [colId, headerName])).toEqual([
         ['rowNumber', '№ п\\п'],
         ['category', 'Категория'],
         ['label', 'Наименование'],
      ]);
      expect(gridProp('modules')).toEqual([
         ClientSideRowModelModule,
         CellStyleModule,
         LocaleModule,
         RenderApiModule,
         TreeDataModule,
      ]);
      expect(gridProp('treeData')).toBe(true);
      expect(gridProp('treeDataParentIdField')).toBe('parentRowId');
      expect(gridProp('treeDataDisplayType')).toBe('custom');
      expect(gridProp('groupDefaultExpanded')).toBe(-1);
      expect(getColumn('category')).toMatchObject({
         showRowGroup: true,
         cellRenderer: 'agGroupCellRenderer',
         cellRendererParams: { suppressCount: true, suppressPadding: true },
      });
      expect(gridProp('localeText')).toEqual({ loadingOoo: 'Загрузка...' });
   });

   it('derives category text and group weights from the node and depth', () => {
      mountTable([], false);
      const category = getColumn('category');
      const label = getColumn('label');

      expect(invoke(category.valueGetter, { node: { group: true } })).toBe('Группа');
      expect(invoke(category.valueGetter, { node: { group: false } })).toBe('Элемент');
      expect(
         invoke(category.cellStyle, {
            node: { group: true, level: 2 },
         }),
      ).toEqual({ fontWeight: 700, '--tree-depth': '2' });
      expect(
         invoke(category.cellStyle, {
            node: { group: false, level: 0 },
         }),
      ).toEqual({ fontWeight: 400, '--tree-depth': '0' });
      expect(invoke(label.cellStyle, { node: { group: true } })).toEqual({
         fontWeight: 700,
      });
      expect(invoke(label.cellStyle, { node: { group: false } })).toEqual({
         fontWeight: 400,
      });
   });

   it('numbers from the displayed row index and handles an absent index', () => {
      mountTable([], false);
      const rowNumber = getColumn('rowNumber');

      expect(
         invoke(rowNumber.valueGetter, {
            data: { id: 'not-the-number', parent: null, label: 'Item' },
            node: { rowIndex: 4 },
         }),
      ).toBe(5);
      expect(
         invoke(rowNumber.valueGetter, {
            data: { id: 50, parent: null, label: 'Item' },
            node: { rowIndex: null },
         }),
      ).toBe('');
      expect(invoke(rowNumber.cellStyle, { node: { group: false } })).toEqual({
         fontWeight: 700,
      });
   });

   it('refreshes only row numbers after the displayed model changes', () => {
      mountTable([], false);
      const refreshCells = vi.fn();

      invoke(gridProp('onModelUpdated'), { api: { refreshCells } });

      expect(refreshCells).toHaveBeenCalledTimes(1);
      expect(refreshCells).toHaveBeenCalledWith({
         columns: ['rowNumber'],
         force: true,
      });
   });
});
