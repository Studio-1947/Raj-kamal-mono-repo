import type { WebsiteCart } from "../../../services/websiteCartsService";

/** wa.me link for a stored phone ("+91 9876543210" or a bare 10-digit number), or null. */
export function whatsappLink(phone: string | null, text?: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/**
 * A ready-to-send nudge that names the books left behind. Out-of-stock books are
 * left out (reminding someone about a book we cannot ship is worse than silence); if
 * nothing in the cart is available there is no message, and the chat opens empty.
 */
export function buildReminderMessage(cart: WebsiteCart): string | undefined {
  const available = cart.items.filter((i) => i.inStock !== false);
  if (available.length === 0) return undefined;

  const first = cart.customer.name?.split(" ")[0];
  const shown = available.slice(0, 3).map((i) => `“${i.name}”`);
  const more = available.length - shown.length;
  const list =
    shown.length === 1
      ? shown[0]
      : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}${more > 0 ? ` (+${more} more)` : ""}`;

  return (
    `Namaste${first ? ` ${first}` : ""}, this is Rajkamal Prakashan. ` +
    `You left ${list} in your cart on rajkamalprakashan.com. ` +
    `${available.length === 1 ? "It is" : "They are"} still available - happy to help if you would like to complete your order.`
  );
}
