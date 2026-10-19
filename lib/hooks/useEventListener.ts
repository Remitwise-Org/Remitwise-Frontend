"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

type EventListenerOptions = AddEventListenerOptions | boolean;
type EventTargetRef<T extends EventTarget> = RefObject<T | null>;

type SupportedEventTarget = Window | Document | HTMLElement;

type EventMapFor<T extends SupportedEventTarget> = T extends Window
  ? WindowEventMap
  : T extends Document
    ? DocumentEventMap
    : HTMLElementEventMap;

type EventHandler<T extends SupportedEventTarget, K extends keyof EventMapFor<T>> = (
  event: EventMapFor<T>[K],
) => void;

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  target?: Window | null,
  options?: EventListenerOptions,
): void;

export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  target: Document | null,
  options?: EventListenerOptions,
): void;

export function useEventListener<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  target: HTMLElement | null,
  options?: EventListenerOptions,
): void;

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  target: EventTargetRef<Window> | null,
  options?: EventListenerOptions,
): void;

export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  target: EventTargetRef<Document> | null,
  options?: EventListenerOptions,
): void;

export function useEventListener<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  target: EventTargetRef<HTMLElement> | null,
  options?: EventListenerOptions,
): void;

export function useEventListener<
  T extends SupportedEventTarget,
  K extends keyof EventMapFor<T>,
>(
  eventName: K,
  handler: EventHandler<T, K>,
  target?: T | EventTargetRef<T> | null,
  options?: EventListenerOptions,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const eventTarget = target === undefined
      ? window
      : target && "current" in target
        ? target.current
        : target;

    if (!eventTarget) {
      return;
    }

    const listener: EventListener = (event) => {
      handlerRef.current(event as EventMapFor<T>[K]);
    };

    eventTarget.addEventListener(eventName as string, listener, options);

    return () => {
      eventTarget.removeEventListener(eventName as string, listener, options);
    };
  }, [eventName, options, target]);
}
