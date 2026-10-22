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
});
