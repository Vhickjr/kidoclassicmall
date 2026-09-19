"use client";

export const CART_OPEN_EVENT = "kido:cart-open";

export function triggerCartOpen() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CART_OPEN_EVENT));
  }
}
