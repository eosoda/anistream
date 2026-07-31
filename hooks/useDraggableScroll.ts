import { useEffect, useRef, useState } from 'react';

export function useDraggableScroll<T extends HTMLElement = HTMLDivElement>() {
  const elementRef = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const slider = elementRef.current;
    if (!slider) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasDraggedDistance = false;
    let suppressClickUntil = 0;
    let activePointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let pointerStartedAt = 0;
    let velocity = 0;
    let momentumFrame: number | null = null;

    const stopMomentum = () => {
      if (momentumFrame !== null) {
        cancelAnimationFrame(momentumFrame);
        momentumFrame = null;
      }
    };

    const startMomentum = () => {
      if (
        Math.abs(velocity) < 0.05 ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      let previousTime = performance.now();
      const glide = (time: number) => {
        const elapsed = Math.min(time - previousTime, 32);
        previousTime = time;
        const previousScrollLeft = slider.scrollLeft;

        slider.scrollLeft += velocity * elapsed;
        velocity *= Math.pow(0.92, elapsed / 16.67);

        const reachedEdge = slider.scrollLeft === previousScrollLeft;
        if (Math.abs(velocity) < 0.02 || reachedEdge) {
          momentumFrame = null;
          return;
        }

        momentumFrame = requestAnimationFrame(glide);
      };

      momentumFrame = requestAnimationFrame(glide);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;

      stopMomentum();
      isDown = true;
      hasDraggedDistance = false;
      activePointerId = e.pointerId;
      startX = e.clientX;
      lastPointerX = e.clientX;
      lastPointerTime = performance.now();
      pointerStartedAt = lastPointerTime;
      velocity = 0;
      scrollLeft = slider.scrollLeft;
    };

    const finishDragging = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;

      if (slider.hasPointerCapture(e.pointerId)) {
        slider.releasePointerCapture(e.pointerId);
      }

      isDown = false;
      activePointerId = null;
      setIsDragging(false);
      if (hasDraggedDistance) {
        suppressClickUntil = performance.now() + 180;
        const gestureDuration = Math.max(performance.now() - pointerStartedAt, 1);
        const averageVelocity = Math.max(
          -1.8,
          Math.min(1.8, (-(e.clientX - startX) / gestureDuration) * 0.35)
        );
        if (Math.abs(averageVelocity) > Math.abs(velocity)) {
          velocity = averageVelocity;
        }
        startMomentum();
      }
      hasDraggedDistance = false;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDown || activePointerId !== e.pointerId) return;

      const now = performance.now();
      const elapsed = Math.max(now - lastPointerTime, 1);
      const pointerDelta = e.clientX - lastPointerX;
      const walk = e.clientX - startX;

      velocity = velocity * 0.55 + (-pointerDelta / elapsed) * 0.45;
      lastPointerX = e.clientX;
      lastPointerTime = now;

      if (Math.abs(walk) > 4) {
        if (!hasDraggedDistance) {
          hasDraggedDistance = true;
          setIsDragging(true);
          slider.setPointerCapture(e.pointerId);
        }

        e.preventDefault();
        slider.scrollLeft = scrollLeft - walk;
      }
    };

    // Intercept click if user was dragging so links/cards don't open accidentally
    const handleClickCapture = (e: MouseEvent) => {
      if (performance.now() <= suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
        suppressClickUntil = 0;
      }
    };

    // Links e imagens são arrastáveis por padrão no desktop. Esse gesto nativo
    // compete com o carrossel e exibe a miniatura "fantasma" do navegador.
    const handleNativeDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    slider.addEventListener('pointerdown', handlePointerDown);
    slider.addEventListener('pointerup', finishDragging);
    slider.addEventListener('pointercancel', finishDragging);
    slider.addEventListener('pointermove', handlePointerMove);
    slider.addEventListener('dragstart', handleNativeDragStart);
    slider.addEventListener('click', handleClickCapture, true);

    return () => {
      stopMomentum();
      slider.removeEventListener('pointerdown', handlePointerDown);
      slider.removeEventListener('pointerup', finishDragging);
      slider.removeEventListener('pointercancel', finishDragging);
      slider.removeEventListener('pointermove', handlePointerMove);
      slider.removeEventListener('dragstart', handleNativeDragStart);
      slider.removeEventListener('click', handleClickCapture, true);
    };
  }, []);

  return { ref: elementRef, elementRef, isDragging };
}
