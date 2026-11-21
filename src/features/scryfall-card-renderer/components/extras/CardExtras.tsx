import { lazy, Suspense } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import type { NormalizedFace } from '../../types.ts';

type ExtraProps = {
  face: NormalizedFace;
};

/**
 * These widgets only apply to a handful of ONE_FACE layouts and are rare
 * in any real card pool — each is lazy-loaded individually so the common
 * `normal` case never pays for them.
 *
 * Every widget receives `face`. The current stubs don't read it yet, so they
 * take no parameters; a component with fewer parameters still fits
 * ComponentType<ExtraProps>.
 */
const EXTRAS_BY_LAYOUT: Partial<Record<string, LazyExoticComponent<ComponentType<ExtraProps>>>> = {
  saga: lazy(() => import('./SagaTracker.tsx')),
  class: lazy(() => import('./ClassLevels.tsx')),
  case: lazy(() => import('./CaseSections.tsx')),
  leveler: lazy(() => import('./LevelerStats.tsx')),
  mutate: lazy(() => import('./MutateBanner.tsx')),
  prototype: lazy(() => import('./PrototypeBanner.tsx')),
};

type CardExtrasProps = {
  layout: string;
  face: NormalizedFace;
};

export default function CardExtras({ layout, face }: CardExtrasProps) {
  const Extra = EXTRAS_BY_LAYOUT[layout];
  if (!Extra) return null;

  return (
    <Suspense fallback={null}>
      <Extra face={face} />
    </Suspense>
  );
}
