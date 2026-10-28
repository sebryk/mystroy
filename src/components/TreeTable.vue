<script setup lang="ts">
import { computed } from 'vue';
import {
   CellStyleModule,
   ClientSideRowModelModule,
   LocaleModule,
   RenderApiModule,
   RowApiModule,
   themeQuartz,
   type ColDef,
   type ModelUpdatedEvent,
   type RowDataUpdatedEvent,
   type SuppressKeyboardEventParams,
} from 'ag-grid-community';
import { TreeDataModule } from 'ag-grid-enterprise';
import { AgGridVue } from 'ag-grid-vue3';
import type { TreeDataItem } from '../composables/useTreeItems';
import type { TreeId } from '../tree-store/TreeStore';
import CategoryCellRenderer from './CategoryCellRenderer.vue';

type TreeTableProps = {
   rows: readonly TreeDataItem[];
   loading: boolean;
   addChild: (parentId: TreeId) => void;
   removeItem: (id: TreeId) => void;
};

type GridRow = TreeDataItem & { parentRowId: string | null };

const props = defineProps<TreeTableProps>();
const pendingExpandIds = new Set<string>();

const toGridId = (id: TreeId): string => `${typeof id}:${id}`;

const rowData = computed<GridRow[]>(() =>
   props.rows.map((item) => ({
      ...item,
      parentRowId: item.parent === null ? null : toGridId(item.parent),
   })),
);

const modules = [ClientSideRowModelModule, CellStyleModule, LocaleModule, RenderApiModule, RowApiModule, TreeDataModule];

const defaultColDef: ColDef<GridRow> = {
   sortable: false,
   filter: false,
   resizable: false,
   suppressMovable: true,
   suppressHeaderMenuButton: true,
};

const handleAddChild = (parentId: TreeId): void => {
   pendingExpandIds.add(toGridId(parentId));
   props.addChild(parentId);
};

const handleCategoryKeyboardEvent = (params: SuppressKeyboardEventParams<GridRow>): boolean => {
   const { event } = params;
   if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
      return false;
   }

   const target = event.target;
   const categoryCell = target instanceof Element ? target.closest<HTMLElement>('.ag-cell.category-cell') : null;
   if (categoryCell === null) {
      return false;
   }

   const buttons = Array.from(categoryCell.querySelectorAll<HTMLButtonElement>('.category-action:not(:disabled)'));
   if (buttons.length === 0) {
      return false;
   }

   const focusedIndex = buttons.findIndex((button) => button === document.activeElement);
   const nextIndex = focusedIndex < 0 ? (event.shiftKey ? buttons.length - 1 : 0) : focusedIndex + (event.shiftKey ? -1 : 1);
   if (nextIndex < 0 || nextIndex >= buttons.length) {
      return false;
   }

   event.preventDefault();
   buttons[nextIndex].focus();
   return true;
};

const columnDefs: ColDef<GridRow>[] = [
   {
      colId: 'rowNumber',
      headerName: '№ п\\п',
      flex: 7.3,
      minWidth: 108,
      valueGetter: ({ node }) => (node?.rowIndex == null ? '' : node.rowIndex + 1),
      cellClass: 'number-cell',
      headerClass: 'row-number-header',
      cellStyle: () => ({ fontWeight: 700 }),
   },
   {
      colId: 'category',
      headerName: 'Категория',
      flex: 32.75,
      minWidth: 280,
      showRowGroup: true,
      cellRenderer: 'agGroupCellRenderer',
      suppressKeyboardEvent: handleCategoryKeyboardEvent,
      cellRendererParams: {
         suppressCount: true,
         suppressPadding: true,
         innerRenderer: CategoryCellRenderer,
         innerRendererParams: {
            onAddChild: handleAddChild,
            onRemove: props.removeItem,
         },
      },
      valueGetter: ({ node }) => (node?.group ? 'Группа' : 'Элемент'),
      cellClass: 'category-cell',
      headerClass: 'category-header',
      cellStyle: ({ node }) => ({
         fontWeight: node.group ? 700 : 400,
         '--tree-depth': String(node.level),
      }),
   },
   {
      colId: 'label',
      headerName: 'Наименование',
      field: 'label',
      cellClass: 'label-cell',
      headerClass: 'label-header',
      flex: 59.95,
      minWidth: 230,
      cellStyle: ({ node }) => ({ fontWeight: node.group ? 700 : 400 }),
   },
];

const getRowId = ({ data }: { data: GridRow }): string => toGridId(data.id);

const localeText = { loadingOoo: 'Загрузка...' };

const theme = themeQuartz.withParams({
   backgroundColor: '#ffffff',
   foregroundColor: '#494949',
   borderColor: '#c4c4c4',
   headerBackgroundColor: '#fdfdfd',
   headerTextColor: '#494949',
   fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
   fontSize: 24,
   headerFontSize: 22,
   headerFontWeight: 700,
   rowHeight: 80,
   rowBorder: { style: 'solid', width: 2, color: '#c4c4c4' },
   iconSize: 24,
   wrapperBorder: false,
   wrapperBorderRadius: 6,
});

const refreshRowNumbers = (event: ModelUpdatedEvent<GridRow>): void => {
   event.api.refreshCells({ columns: ['rowNumber', 'category', 'label'], force: true });
};

const expandAddedParents = (event: RowDataUpdatedEvent<GridRow>): void => {
   for (const parentId of pendingExpandIds) {
      event.api.getRowNode(parentId)?.setExpanded(true);
   }
   pendingExpandIds.clear();
};
</script>

<template>
   <AgGridVue
      class="tree-grid"
      :row-data="rowData"
      :column-defs="columnDefs"
      :default-col-def="defaultColDef"
      :modules="modules"
      :tree-data="true"
      tree-data-parent-id-field="parentRowId"
      tree-data-display-type="custom"
      :group-default-expanded="-1"
      :get-row-id="getRowId"
      :loading="loading"
      :locale-text="localeText"
      :row-height="80"
      :header-height="80"
      :animate-rows="false"
      :suppress-group-rows-sticky="true"
      :suppress-context-menu="true"
      :theme="theme"
      @model-updated="refreshRowNumbers"
      @row-data-updated="expandAddedParents"
   />
</template>

<style scoped>
.tree-grid {
   width: 100%;
   height: 100%;
   min-width: 100%;
}

:deep(.ag-cell.category-cell .ag-group-value) {
   margin-inline-start: calc(var(--tree-depth, 0) * 20px);
}

:deep(.ag-cell.number-cell) {
   padding-inline-start: 29px;
}

:deep(.ag-header-cell.row-number-header) {
   padding-inline-start: 15px;
}

:deep(.ag-cell.category-cell) {
   padding-inline-start: 20px;
}

:deep(.ag-header-cell.category-header) {
   padding-inline-start: 14px;
}

:deep(.ag-cell.category-cell .category-cell-renderer) {
   width: 100%;
}

:deep(.ag-cell.label-cell),
:deep(.ag-header-cell.label-header) {
   padding-inline-start: 32px;
}

:deep(.ag-cell.category-cell .ag-group-expanded),
:deep(.ag-cell.category-cell .ag-group-contracted) {
   margin-inline-end: 22px;
}

:deep(.ag-row:not(.ag-row-group) .ag-cell.category-cell .ag-cell-wrapper) {
   margin-inline-start: 46px;
}

:deep(.ag-header-cell-label) {
   font-weight: 700;
}

:deep(.ag-header-cell:not(:last-child)) {
   border-inline-end: 1px solid #c4c4c4;
}
</style>
