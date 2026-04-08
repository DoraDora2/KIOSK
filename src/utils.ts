import type { BasicSideDish, MenuItem } from "./menu";

export type CartItem = {
  item: MenuItem;
  quantity: number;
  selectedSideDishes: BasicSideDish[];
};

const priceFormatter = new Intl.NumberFormat("ko-KR");

export function formatPrice(price: number) {
  return `${priceFormatter.format(price)}원`;
}

export function getLineTotal(price: number, quantity: number) {
  return price * quantity;
}

export function getCartCount(cartItems: CartItem[]) {
  return cartItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0);
}

export function getCartItemKey(
  cartItem: Pick<CartItem, "item" | "selectedSideDishes">,
) {
  const sideDishKey = cartItem.selectedSideDishes.join("|");

  return `${cartItem.item.id}::${sideDishKey}`;
}

export function getCartTotal(cartItems: CartItem[]) {
  return cartItems.reduce(
    (sum, cartItem) => sum + getLineTotal(cartItem.item.price, cartItem.quantity),
    0,
  );
}

export function formatOrderTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function estimateWaitMinutes(totalCount: number) {
  return Math.max(8, 8 + totalCount * 2);
}
