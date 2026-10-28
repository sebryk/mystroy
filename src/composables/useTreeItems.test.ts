// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTreeItems } from './useTreeItems';

afterEach(() => {
   vi.restoreAllMocks();
});

describe('useTreeItems', () => {
   it('adds named children with unique string IDs in sibling order and preserves parent ID types', () => {
      const { store, rows, addChild } = useTreeItems();
      store.setItems([
         { id: 1, parent: null, label: 'Numeric parent' },
         { id: '1', parent: null, label: 'String parent' },
      ]);
      rows.value = store.getAll();
      const existingRows = rows.value;
      const randomUUID = vi
         .spyOn(crypto, 'randomUUID')
         .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
         .mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
         .mockReturnValueOnce('00000000-0000-4000-8000-000000000003');

      addChild(1);
      addChild(1);
      addChild('1');

      expect(randomUUID).toHaveBeenCalledTimes(3);
      expect(rows.value).not.toBe(existingRows);
      expect(rows.value).toEqual([
         { id: 1, parent: null, label: 'Numeric parent' },
         { id: '1', parent: null, label: 'String parent' },
         { id: '00000000-0000-4000-8000-000000000001', parent: 1, label: 'Новый элемент' },
         { id: '00000000-0000-4000-8000-000000000002', parent: 1, label: 'Новый элемент' },
         { id: '00000000-0000-4000-8000-000000000003', parent: '1', label: 'Новый элемент' },
      ]);
   });

   it('does nothing when adding a child to a missing parent', () => {
      const { store, rows, addChild } = useTreeItems();
      store.setItems([{ id: 1, parent: null, label: 'Parent' }]);
      rows.value = store.getAll();
      const existingRows = rows.value;
      const randomUUID = vi.spyOn(crypto, 'randomUUID');

      addChild('missing');

      expect(rows.value).toBe(existingRows);
      expect(randomUUID).not.toHaveBeenCalled();
   });

   it('removes a row and its descendants while preserving neighboring branches', () => {
      const { store, rows, removeItem } = useTreeItems();
      store.setItems([
         { id: 'root', parent: null, label: 'Root' },
         { id: 'branch', parent: 'root', label: 'Branch' },
         { id: 'leaf', parent: 'branch', label: 'Leaf' },
         { id: 'neighbor', parent: 'root', label: 'Neighbor' },
      ]);
      rows.value = store.getAll();
      const existingRows = rows.value;

      removeItem('branch');

      expect(rows.value).not.toBe(existingRows);
      expect(rows.value.map(({ id }) => id)).toEqual(['root', 'neighbor']);
   });
});
