# Cosmos IBC Autostake (Auto-Compound) for Organizations

The auto-compounder makes use of a new feature in Cosmos blockchains called `Authz`. This allows a validator (or any other wallet) to send certain pre-authorized transactions on your behalf.

[![](./docs/preview.png)](https://ibc.foxfrens.com)

When you authorize the compound bot, you allow the bot to create transactions with `WithdrawDelegatorReward`  and `Delegate` only to the validator that have been approved by you - personal funds are never exposed, and the compounding bot cannot delegate to an unapproved validator. The authorisation has been set to automatically expire after four months, and you can revoke the permissions at any time.

## To-Do

[x] Re-themed for DAOs and Organizations with multiple validator holdings
[ ] Compound APY Calculator / Guesstimator
[ ] One-click Redelegate All to Host Validator
[ ] Mobile Support 

---

BETA SOFTWARE: Use at your own risk. The compound bot has no access to wallet funds and is only authorized to claim and re-stake rewards. However, as with all new software, it is recommended to proceed with caution.

