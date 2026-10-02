# 15: Real payments with PayPal

**What to build:** Customers pay through PayPal instead of the simulated payment, when the store is configured with PayPal credentials. Cancelled orders are refunded. Without credentials, the store keeps simulating payments.

**Blocked by:** 06 (Checkout), 07 (Order history and cancel)

**Status:** done (verified against a fake PayPal; a real sandbox payment needs sandbox credentials)

- [x] Two-step checkout: `POST /api/checkout` (price from the database, store the attempt, create the PayPal order) and `POST /api/checkout/:id/complete` (capture, check amount and currency, create the order); replaces `POST /api/orders`
- [x] Safe retries: completing twice returns the same order; the order id is the checkout id; PayPal requests use `PayPal-Request-Id`; an already captured order is looked up instead of failing
- [x] Declined funding sources let the buyer choose another (`actions.restart()`); unapproved payments and PayPal outages give clear errors and leave no order
- [x] A captured payment is never lost: its checkout no longer expires, and storing the order is retried on the next completion
- [x] Cancelling a paid order (customer or admin) refunds it in full, idempotently; if the refund fails the order stays placed
- [x] PayPal client over `fetch` (token cached and renewed, Orders v2 create/capture/get, Payments v2 refund); config `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENVIRONMENT` (sandbox by default); the secret never reaches the browser
- [x] Frontend: PayPal's JS SDK buttons in checkout, wording in all six languages for the simulated, sandbox and live modes, refund wording in cancel dialogs, refund reference on the admin order page
- [x] Tests: checkout and refund flows against a fake provider, the PayPal client against a fake PayPal API, config, the footer by mode; browser checks of the simulated flow and of PayPal mode's wording and SDK failure message

## Comments

**Done (2026-09-30).**

- **Not yet tested against PayPal itself.** Approving a payment needs a sandbox app and a sandbox buyer account; the README explains how to set them up.
- **Pending captures** (PayPal holding money for review) are treated as failed: the store only creates orders for completed payments. A payment that later completes on PayPal's side would need a refund by hand.
- **Only the PayPal button is offered** (`fundingSource: PAYPAL`), because the order is created with PayPal's experience settings; PayPal offers guest card payment inside its window where available.
- **Live mode** needs legal groundwork this project doesn't include; see the README.
