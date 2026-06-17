import { useEffect, useState } from 'react';
import { useFinanceStore } from './financeStore';

/** True once Zustand persist has finished loading localStorage into the store. */
export function useFinanceHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useFinanceStore.persist.hasHydrated());

  useEffect(() => {
    setHydrated(useFinanceStore.persist.hasHydrated());

    return useFinanceStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  return hydrated;
}