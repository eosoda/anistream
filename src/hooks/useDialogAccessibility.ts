'use client';

import { useEffect, useId, useRef } from 'react';

const focusableSelector =
  'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const inertState = new Map<HTMLElement, { count: number; wasInert: boolean }>();
const dialogStack: symbol[] = [];

function acquireInert(element: HTMLElement) {
  const current = inertState.get(element);
  if (current) {
    current.count += 1;
    return;
  }
  inertState.set(element, { count: 1, wasInert: element.hasAttribute('inert') });
  element.setAttribute('inert', '');
}

function releaseInert(element: HTMLElement) {
  const current = inertState.get(element);
  if (!current) return;
  current.count -= 1;
  if (current.count > 0) return;
  if (!current.wasInert) element.removeAttribute('inert');
  inertState.delete(element);
}

function backgroundSiblings(panel: HTMLElement) {
  const elements = new Set<HTMLElement>();
  let branch: HTMLElement | null = panel;
  while (branch?.parentElement && branch.parentElement !== document.body) {
    const container: HTMLElement = branch.parentElement;
    for (const sibling of Array.from(container.children)) {
      if (sibling !== branch && sibling instanceof HTMLElement) elements.add(sibling);
    }
    branch = container;
  }
  if (branch?.parentElement === document.body) {
    for (const sibling of Array.from(document.body.children)) {
      if (sibling !== branch && sibling instanceof HTMLElement) elements.add(sibling);
    }
  }
  return Array.from(elements);
}

export function useDialogAccessibility(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const background = backgroundSiblings(panel);
    const dialogToken = Symbol('dialog');
    dialogStack.push(dialogToken);
    document.body.style.overflow = 'hidden';
    background.forEach(acquireInert);

    const timer = window.setTimeout(
      () => panel.querySelector<HTMLElement>(focusableSelector)?.focus(),
      0,
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (dialogStack.at(-1) !== dialogToken) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      if (!nodes.length) {
        event.preventDefault();
        panel.focus();
      } else if (event.shiftKey && document.activeElement === nodes[0]) {
        event.preventDefault();
        nodes.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
        event.preventDefault();
        nodes[0].focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      background.forEach(releaseInert);
      const stackIndex = dialogStack.lastIndexOf(dialogToken);
      if (stackIndex >= 0) dialogStack.splice(stackIndex, 1);
      document.removeEventListener('keydown', handleKeyDown);
      returnFocus.current?.focus();
    };
  }, [onClose, open]);

  return { panelRef, titleId };
}
