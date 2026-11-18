// =====================================================================
// Mostrar entera la tarjeta que se abre
// ---------------------------------------------------------------------
// Cuando se despliega una tarjeta (por ejemplo, en «Tus alquileres»), la pantalla se corre sola
// para que se vea completa: si ya se ve entera no se mueve; si no, la deja hacia arriba de la
// pantalla (o en el medio, si es alta). La pantalla que tiene la lista crea el «revelador» con
// useRevealScroll y se lo pasa a las tarjetas con RevealProvider; cada tarjeta lo toma con useReveal.
// =====================================================================

import { createContext, useCallback, useContext, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';

type Reveal = (view: View | null) => void;

const RevealContext = createContext<Reveal | null>(null);
export const RevealProvider = RevealContext.Provider;
export const useReveal = () => useContext(RevealContext);

// Aire que queda entre la tarjeta y el borde de la pantalla.
const MARGIN = 16;
// Una tarjeta chica queda con su borde de arriba a esta altura de la pantalla (un cuarto).
const PREFERRED_TOP = 0.25;

export function useRevealScroll() {
  const ref = useRef<ScrollView>(null);
  const offset = useRef(0);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);

  const reveal = useCallback<Reveal>((view) => {
    const scroll = ref.current;
    if (!view || !scroll) return;
    const frame = (scroll.getNativeScrollRef?.() ?? scroll) as unknown as View;
    frame.measureInWindow((_sx, sy, _sw, sh) => {
      view.measureInWindow((_x, y, _w, h) => {
        if (!sh || !h) return;
        const top = y - sy;
        if (top >= MARGIN && top + h <= sh - MARGIN) return;
        const wanted = Math.max(MARGIN, Math.min((sh - h) / 2, sh * PREFERRED_TOP));
        ref.current?.scrollTo({ y: Math.max(0, offset.current + top - wanted), animated: true });
      });
    });
  }, []);

  return { ref, onScroll, reveal };
}
