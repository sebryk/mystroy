<script setup lang="ts">
import { onMounted } from 'vue';
import TreeTable from './components/TreeTable.vue';
import { useTreeItems } from './composables/useTreeItems';
import HistoryButton from './components/HistoryButton.vue';

const { rows, loading, error, load, addChild, removeItem } = useTreeItems();

onMounted(() => {
   void load();
});
</script>

<template>
   <main class="page-shell">
      <HistoryButton><</HistoryButton>
      <HistoryButton>></HistoryButton>
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

.load-error {
   margin: 0;
   color: #494949;
   font-size: 18px;
}
</style>
