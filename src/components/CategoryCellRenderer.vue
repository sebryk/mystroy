<script setup lang="ts">
import type { ICellRendererParams } from 'ag-grid-community';
import type { TreeDataItem } from '../composables/useTreeItems';
import type { TreeId } from '../tree-store/TreeStore';

type CategoryCellRendererParams = ICellRendererParams<TreeDataItem> & {
   onAddChild: (id: TreeId) => void;
   onRemove: (id: TreeId) => void;
};

const props = defineProps<{ params: CategoryCellRendererParams }>();

const addChild = (): void => {
   const row = props.params.data;
   if (row !== undefined) {
      props.params.onAddChild(row.id);
   }
};

const removeItem = (): void => {
   const row = props.params.data;
   if (row !== undefined) {
      props.params.onRemove(row.id);
   }
};

const stopButtonKeyEvent = (event: KeyboardEvent): void => {
   if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
   }
};
</script>

<template>
   <span class="category-cell-renderer">
      <span class="category-label">{{ params.value ?? '' }}</span>
      <span class="category-actions">
         <button
            class="category-action"
            type="button"
            aria-label="Добавить дочерний элемент"
            :disabled="params.data === undefined"
            @mousedown.stop
            @dblclick.stop
            @touchstart.stop
            @keydown="stopButtonKeyEvent"
            @keyup="stopButtonKeyEvent"
            @click.stop="addChild"
         >
            +
         </button>
         <button
            class="category-action"
            type="button"
            aria-label="Удалить строку и потомков"
            :disabled="params.data === undefined"
            @mousedown.stop
            @dblclick.stop
            @touchstart.stop
            @keydown="stopButtonKeyEvent"
            @keyup="stopButtonKeyEvent"
            @click.stop="removeItem"
         >
            x
         </button>
      </span>
   </span>
</template>

<style>
.category-cell-renderer {
   display: flex;
   align-items: center;
   gap: 12px;
   min-width: 0;
   width: 100%;
}

.category-label {
   overflow: hidden;
   text-overflow: ellipsis;
   white-space: nowrap;
}

.category-actions {
   display: flex;
   flex-shrink: 0;
   gap: 8px;
   margin-inline-start: auto;
}

.category-action {
   display: grid;
   width: 36px;
   height: 36px;
   place-items: center;
   border: 1px solid #c4c4c4;
   border-radius: 5px;
   background: #fff;
   color: #494949;
   font: inherit;
   font-size: 22px;
   line-height: 1;
   cursor: pointer;
}

.category-action:hover:not(:disabled) {
   background: #f3f2f1;
}

.category-action:focus-visible {
   outline: 2px solid #3268a8;
   outline-offset: 2px;
}

.category-action:disabled {
   cursor: not-allowed;
   opacity: 0.5;
}
</style>
