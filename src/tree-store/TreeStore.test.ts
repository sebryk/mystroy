import { describe, expect, expectTypeOf, it } from 'vitest';
import { TreeStore, type TreeItem } from './TreeStore';

type SampleItem = TreeItem & {
  label: string;
  extra?: { visible: boolean };
};

const ITEMS: readonly SampleItem[] = [
  { id: 'leaf', parent: 'branch', label: 'Лист', extra: { visible: true } },
  { id: 0, parent: null, label: 'Корень' },
  { id: '0', parent: 0, label: 'Строковый ID' },
  { id: 'branch', parent: 0, label: 'Ветка' },
  { id: 42, parent: 'branch', label: 'Второй лист' },
];

describe('TreeStore', () => {
  it('returns empty results for an empty store', () => {
    const emptyStore = new TreeStore<SampleItem>([]);

    expect(emptyStore.getAll()).toEqual([]);
    expect(emptyStore.getItem(0)).toBeUndefined();
    expect(emptyStore.getChildren(0)).toEqual([]);
  });

  it('returns empty children for leaves and missing ids', () => {
    const store = new TreeStore(ITEMS);

    expect(store.getItem('missing')).toBeUndefined();
    expect(store.getChildren('leaf')).toEqual([]);
    expect(store.getChildren('missing')).toEqual([]);
  });

  it('preserves input order and indexes children before their parents', () => {
    const store = new TreeStore(ITEMS);

    expect(store.getAll()).toEqual(ITEMS);
    expect(store.getItem('leaf')).toBe(ITEMS[0]);
    expect(store.getChildren(0).map((item) => item.id)).toEqual([
      '0',
      'branch',
    ]);
    expect(store.getChildren('branch').map((item) => item.id)).toEqual([
      'leaf',
      42,
    ]);
    expect(ITEMS.map((item) => item.id)).toEqual([
      'leaf',
      0,
      '0',
      'branch',
      42,
    ]);
  });

  it('distinguishes numeric zero from string zero', () => {
    const store = new TreeStore(ITEMS);

    expect(store.getItem(0)?.label).toBe('Корень');
    expect(store.getItem('0')?.label).toBe('Строковый ID');
    expect(store.getChildren('0')).toEqual([]);
  });

  it('retains arbitrary item fields and inferred types', () => {
    const store = new TreeStore(ITEMS);

    expect(store.getItem('leaf')?.extra).toEqual({ visible: true });
    expectTypeOf(store.getItem('leaf')).toEqualTypeOf<
      SampleItem | undefined
    >();
    expectTypeOf(store.getAll()).toEqualTypeOf<SampleItem[]>();
    expectTypeOf(store.getChildren(0)).toEqualTypeOf<SampleItem[]>();
  });

  it('returns descendants breadth-first in sibling insertion order', () => {
    const items: readonly SampleItem[] = [
      ...ITEMS,
      { id: 'zero-child', parent: '0', label: 'Строковый лист' },
    ];
    const store = new TreeStore(items);
    const descendants = store.getAllChildren(0);

    expect(descendants.map((item) => item.id)).toEqual([
      '0', 'branch', 'zero-child', 'leaf', 42,
    ]);
    expect(store.getAllChildren('0').map((item) => item.id)).toEqual([
      'zero-child',
    ]);
    expect(store.getAllChildren('branch').map((item) => item.id)).toEqual([
      'leaf', 42,
    ]);
    expect(descendants[3]).toBe(ITEMS[0]);
    expect(descendants[3]?.extra).toEqual({ visible: true });
    expectTypeOf(descendants).toEqualTypeOf<SampleItem[]>();
  });

  it('returns the item-to-root path and keeps mixed ids distinct', () => {
    const store = new TreeStore(ITEMS);
    const parents = store.getAllParents('leaf');

    expect(parents.map((item) => item.id)).toEqual(['leaf', 'branch', 0]);
    expect(store.getAllParents(0).map((item) => item.id)).toEqual([0]);
    expect(store.getAllParents('0').map((item) => item.id)).toEqual([
      '0', 0,
    ]);
    expect(parents[0]).toBe(ITEMS[0]);
    expect(parents[1]).toBe(ITEMS[3]);
    expect(parents[2]).toBe(ITEMS[1]);
    expect(parents[0]?.extra).toEqual({ visible: true });
    expectTypeOf(parents).toEqualTypeOf<SampleItem[]>();
  });

  it('returns empty traversal results for empty stores, leaves and missing ids', () => {
    const emptyStore = new TreeStore<SampleItem>([]);
    const store = new TreeStore(ITEMS);

    expect(emptyStore.getAllChildren(0)).toEqual([]);
    expect(emptyStore.getAllParents(0)).toEqual([]);
    expect(store.getAllChildren('leaf')).toEqual([]);
    expect(store.getAllChildren('missing')).toEqual([]);
    expect(store.getAllParents('missing')).toEqual([]);
  });

  it('traverses a 20,000-item chain without recursion', () => {
    const chain: TreeItem[] = Array.from({ length: 20_000 }, (_, id) => ({
      id,
      parent: id === 0 ? null : id - 1,
    }));
    const store = new TreeStore(chain);

    expect(store.getAllChildren(0)).toEqual(chain.slice(1));
    expect(store.getAllParents(19_999)).toEqual([...chain].reverse());
  });

  it('loads readonly items into a cached empty store', () => {
    const store = new TreeStore<SampleItem>([]);
    const before = store.getAll();

    store.setItems(ITEMS);

    expect(store.getAll()).toEqual(ITEMS);
    expect(store.getAll()).not.toBe(before);
    expect(store.getItem('leaf')).toBe(ITEMS[0]);
    expect(store.getChildren(0)).toEqual([ITEMS[2], ITEMS[3]]);
    expect(store.getAllChildren(0)).toEqual([
      ITEMS[2], ITEMS[3], ITEMS[0], ITEMS[4],
    ]);
    expect(store.getAllParents('leaf')).toEqual([
      ITEMS[0], ITEMS[3], ITEMS[1],
    ]);
  });

  it('replaces cached items and discards old relations for reused ids', () => {
    const store = new TreeStore(ITEMS);
    const before = store.getAll();
    const leaf: SampleItem = {
      id: 'leaf',
      parent: 0,
      label: 'New leaf',
      extra: { visible: false },
    };
    const child: SampleItem = {
      id: 'new-child',
      parent: 'new-root',
      label: 'New child',
    };
    const root: SampleItem = {
      id: 'new-root',
      parent: null,
      label: 'New root',
    };
    const zero: SampleItem = {
      id: 0,
      parent: null,
      label: 'Replacement zero',
    };
    const branch: SampleItem = {
      id: 'branch',
      parent: null,
      label: 'Replacement branch',
    };
    const replacement: readonly SampleItem[] = [
      leaf, child, root, zero, branch,
    ];

    store.setItems(replacement);

    expect(store.getAll()).toEqual(replacement);
    expect(store.getAll()).not.toBe(before);
    expect(store.getAll()[0]).toBe(leaf);
    expect(store.getItem('leaf')).toBe(leaf);
    expect(store.getItem('branch')).toBe(branch);
    expect(store.getItem('0')).toBeUndefined();
    expect(store.getItem(42)).toBeUndefined();
    expect(store.getChildren(0)).toEqual([leaf]);
    expect(store.getChildren('branch')).toEqual([]);
    expect(store.getChildren('new-root')).toEqual([child]);
    expect(store.getAllChildren(0)).toEqual([leaf]);
    expect(store.getAllChildren('branch')).toEqual([]);
    expect(store.getAllChildren('new-root')).toEqual([child]);
    expect(store.getAllParents('leaf')).toEqual([leaf, zero]);
    expect(store.getAllParents('branch')).toEqual([branch]);
    expect(store.getAllParents('new-child')).toEqual([child, root]);
    expect(leaf.extra).toEqual({ visible: false });
  });

  it('clears cached items and every relation with empty replacement', () => {
    const store = new TreeStore(ITEMS);
    const before = store.getAll();

    store.setItems([]);

    expect(store.getAll()).toEqual([]);
    expect(store.getAll()).not.toBe(before);
    for (const id of ['leaf', 0, '0', 'branch', 42]) {
      expect(store.getItem(id)).toBeUndefined();
      expect(store.getChildren(id)).toEqual([]);
      expect(store.getAllChildren(id)).toEqual([]);
      expect(store.getAllParents(id)).toEqual([]);
    }
  });

  it('appends roots to cached items and keeps zero ids distinct', () => {
    const existing: SampleItem = {
      id: 'existing',
      parent: null,
      label: 'Existing root',
    };
    const zero: SampleItem = { id: 0, parent: null, label: 'Number zero' };
    const stringZero: SampleItem = {
      id: '0',
      parent: null,
      label: 'String zero',
    };
    const store = new TreeStore([existing]);
    const beforeZero = store.getAll();

    store.addItem(zero);

    const afterZero = store.getAll();
    expect(afterZero).toEqual([existing, zero]);
    expect(afterZero).not.toBe(beforeZero);

    const beforeStringZero = store.getAll();
    store.addItem(stringZero);

    const afterStringZero = store.getAll();
    expect(afterStringZero).toEqual([existing, zero, stringZero]);
    expect(afterStringZero).not.toBe(beforeStringZero);
    expect(store.getItem('existing')).toBe(existing);
    expect(store.getItem(0)).toBe(zero);
    expect(store.getItem('0')).toBe(stringZero);
    expect(store.getAllParents(0)).toEqual([zero]);
    expect(store.getAllParents('0')).toEqual([stringZero]);
    expect(store.getChildren(0)).toEqual([]);
    expect(store.getChildren('0')).toEqual([]);
    expect(store.getAllChildren(0)).toEqual([]);
    expect(store.getAllChildren('0')).toEqual([]);
  });

  it('adds a first child and preserves cached queries and sibling order', () => {
    const store = new TreeStore(ITEMS);
    const stringChild: SampleItem = {
      id: 'string-child',
      parent: '0',
      label: 'String child',
      extra: { visible: false },
    };
    const numberChild: SampleItem = {
      id: 'number-child',
      parent: 0,
      label: 'Number child',
    };
    const beforeStringChild = store.getAll();

    store.addItem(stringChild);

    const afterStringChild = store.getAll();
    expect(afterStringChild).toEqual([...ITEMS, stringChild]);
    expect(afterStringChild).not.toBe(beforeStringChild);

    const beforeNumberChild = store.getAll();
    store.addItem(numberChild);

    const afterNumberChild = store.getAll();
    expect(afterNumberChild).toEqual([...ITEMS, stringChild, numberChild]);
    expect(afterNumberChild).not.toBe(beforeNumberChild);
    expect(store.getItem('string-child')).toBe(stringChild);
    expect(store.getItem('number-child')).toBe(numberChild);
    expect(store.getItem('leaf')).toBe(ITEMS[0]);
    expect(stringChild.extra).toEqual({ visible: false });
    expect(store.getChildren('0')).toEqual([stringChild]);
    expect(store.getChildren(0)).toEqual([
      ITEMS[2], ITEMS[3], numberChild,
    ]);
    expect(store.getAllChildren(0)).toEqual([
      ITEMS[2], ITEMS[3], numberChild, stringChild, ITEMS[0], ITEMS[4],
    ]);
    expect(store.getAllChildren('0')).toEqual([stringChild]);
    expect(store.getAllParents('string-child')).toEqual([
      stringChild, ITEMS[2], ITEMS[1],
    ]);
    expect(store.getAllParents('number-child')).toEqual([
      numberChild, ITEMS[1],
    ]);
    expectTypeOf(store.getItem('string-child')).toEqualTypeOf<
      SampleItem | undefined
    >();
    expectTypeOf(store.getAll()).toEqualTypeOf<SampleItem[]>();
    expectTypeOf(store.getChildren('0')).toEqualTypeOf<SampleItem[]>();
    expectTypeOf(store.getAllChildren(0)).toEqualTypeOf<SampleItem[]>();
    expectTypeOf(store.getAllParents('string-child')).toEqualTypeOf<
      SampleItem[]
    >();
  });
});
