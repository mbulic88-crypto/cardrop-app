// iOS checkout is handled server-side — see GET /ios-checkout in server/routes.ts.
// The server validates the one-time token, marks it used immediately,
// creates a Stripe Checkout session, and 302-redirects the browser to Stripe.
export default function IosCheckoutPlaceholder() {
  return null;
}
