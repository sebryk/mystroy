import { Console } from 'node:console';
import { expect, test } from 'vitest';
import { TreeStore } from './TreeStore';

const createItems = (getParent: (id: number) => number) =>
   Array.from({ length: 10_000 }, (_, index) => {
      const id = index + 1;

      return {
         id,
         parent: id === 1 ? null : getParent(id),
         label: `Item ${id}`,
      };
   });

const wide = createItems(() => 1);
const deep = createItems((id) => id - 1);

const wideStore = new TreeStore(wide);
const deepStore = new TreeStore(deep);
const options = {
   time: 0,
   iterations: 5,
   warmup: true,
   warmupTime: 0,
   warmupIterations: 1,
};
const benchmarkConsole = new Console({
   stdout: process.stdout,
   stderr: process.stderr,
});

let constructed: TreeStore<(typeof wide)[number]> | undefined;
let foundItem: (typeof wide)[number] | undefined;
let descendants: (typeof wide)[number][] | undefined;
let ancestors: (typeof deep)[number][] | undefined;
let removalStore = new TreeStore(deep);

test('TreeStore performance', async ({ bench }) => {
   const construction = await bench('construction', { async: false }, () => {
      constructed = new TreeStore(wide);
   }).run(options);
   if (construction.state !== 'completed') {
      throw new Error('construction did not complete');
   }
   if (constructed === undefined) {
      throw new Error('construction produced no store');
   }
   expect(constructed.getAll()).toHaveLength(10_000);

   const lookup = await bench('getItem(10000)', { async: false }, () => {
      foundItem = wideStore.getItem(10_000);
   }).run(options);
   if (lookup.state !== 'completed') {
      throw new Error('getItem(10000) did not complete');
   }
   if (foundItem === undefined) {
      throw new Error('getItem(10000) found no item');
   }
   expect(foundItem.id).toBe(10_000);

   const childLookup = await bench('getAllChildren(1)', { async: false }, () => {
      descendants = wideStore.getAllChildren(1);
   }).run(options);
   if (childLookup.state !== 'completed') {
      throw new Error('getAllChildren(1) did not complete');
   }
   if (descendants === undefined) {
      throw new Error('getAllChildren(1) returned no result');
   }
   expect(descendants).toHaveLength(9_999);

   const parentLookup = await bench('getAllParents(10000)', { async: false }, () => {
      ancestors = deepStore.getAllParents(10_000);
   }).run(options);
   if (parentLookup.state !== 'completed') {
      throw new Error('getAllParents(10000) did not complete');
   }
   if (ancestors === undefined) {
      throw new Error('getAllParents(10000) returned no result');
   }
   expect(ancestors).toHaveLength(10_000);
   expect(ancestors[0]?.id).toBe(10_000);
   expect(ancestors[ancestors.length - 1]?.id).toBe(1);

   const removal = await bench(
      'removeItem(5001)',
      {
         async: false,
         beforeEach: () => {
            removalStore = new TreeStore(deep);
         },
      },
      () => removalStore.removeItem(5_001),
   ).run(options);
   if (removal.state !== 'completed') {
      throw new Error('removeItem(5001) did not complete');
   }
   expect(removalStore.getAll()).toHaveLength(5_000);
   expect(removalStore.getItem(5_000)?.id).toBe(5_000);
   expect(removalStore.getItem(5_001)).toBeUndefined();
   expect(removalStore.getItem(10_000)).toBeUndefined();

   benchmarkConsole.table([
      {
         operation: 'construction',
         'mean ms': construction.latency.mean.toFixed(6),
      },
      {
         operation: 'getItem(10000)',
         'mean ms': lookup.latency.mean.toFixed(6),
      },
      {
         operation: 'getAllChildren(1)',
         'mean ms': childLookup.latency.mean.toFixed(6),
      },
      {
         operation: 'getAllParents(10000)',
         'mean ms': parentLookup.latency.mean.toFixed(6),
      },
      {
         operation: 'removeItem(5001)',
         'mean ms': removal.latency.mean.toFixed(6),
      },
   ]);
});
