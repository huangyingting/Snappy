# ADR 0004: Funding and fulfillment

Accepted. Workspaces start unfunded. Only administrators reconcile funds already received, using a unique external settlement reference. Sending reserves budget; redemption consumes escrow and refunds unused budget. Expiry refunds occur once. All changes are transactional; insufficient inventory, escrow, or wallet balance is an explicit error.

Vendor earnings accrue internally and are not represented as executed payouts. Charity requests remain pending until an administrator records an actual transfer. Carrier information and shipping checkpoints are recorded by vendors; unknown hubs, weights, tracking numbers, and delivery dates remain unknown.

Recipients may change delivery details and eligible gifts before dispatch. Dispatch locks changes; terminal delivery states cannot be reversed.
