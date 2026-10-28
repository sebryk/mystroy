<script setup lang="ts">
import { onMounted } from 'vue';
import TreeTable from './components/TreeTable.vue';

import { useTreeItems } from './composables/useTreeItems';

const { rows, loading, error, load, addChild, removeItem, undo, redo } = useTreeItems();

onMounted(() => {
   void load();
});
</script>

<template>
   <main class="page-shell">
      <div class="history-actions-wrapper">
         <button class="category-action" @click="undo">←</button>
         <button class="category-action" @click="redo">→</button>
      </div>
      <p v-if="error" class="load-error" role="alert">{{ error }}</p>
      <TreeTable v-else :rows="rows" :loading="loading" :add-child="addChild" :remove-item="removeItem" />
   </main>
</template>

<style scoped>
.page-shell {
   height: 100vh;
   min-height: 100vh;
   box-sizing: border-box;
   padding: 33px 22px 24px 20px;
}

.history-actions-wrapper {
   display: flex;
   gap: 10px;
   margin-bottom: 10px;
}

.load-error {
   margin: 0;
   color: #494949;
   font-size: 18px;
}
</style>
