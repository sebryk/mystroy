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
});
