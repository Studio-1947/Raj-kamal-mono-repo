/** wa.me link for a stored phone ("+91 9876543210" or a bare 10-digit number), or null. */
export function whatsappLink(phone: string | null, text?: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
