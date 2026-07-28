import { useRef, useEffect, useState } from 'react';

export function useDraggableScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const slider = ref.current;
    if (!slider) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasDraggedDistance = false;

    const handleMouseDown = (e: MouseEvent) => {
      // Only drag on left click
      if (e.button !== 0) return;
      isDown = true;
      hasDraggedDistance = false;
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const handleMouseLeave = () => {
      if (isDown) {
        isDown = false;
        setIsDragging(false);
      }
    };

    const handleMouseUp = () => {
      if (isDown) {
        isDown = false;
        setIsDragging(false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.2;
      if (Math.abs(walk) > 4) {
        if (!hasDraggedDistance) {
          hasDraggedDistance = true;
          setIsDragging(true);
        }
        e.preventDefault();
        slider.scrollLeft = scrollLeft - walk;
      }
    };

    // Intercept click if user was dragging so links/cards don't open accidentally
    const handleClickCapture = (e: MouseEvent) => {
      if (hasDraggedDistance) {
        e.preventDefault();
        e.stopPropagation();
        hasDraggedDistance = false;
      }
    };

    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('mouseleave', handleMouseLeave);
    slider.addEventListener('mouseup', handleMouseUp);
    slider.addEventListener('mousemove', handleMouseMove);
    slider.addEventListener('click', handleClickCapture, true);

    return () => {
      slider.removeEventListener('mousedown', handleMouseDown);
      slider.removeEventListener('mouseleave', handleMouseLeave);
      slider.removeEventListener('mouseup', handleMouseUp);
      slider.removeEventListener('mousemove', handleMouseMove);
      slider.removeEventListener('click', handleClickCapture, true);
    };
  }, []);

  return { ref, isDragging };
}
