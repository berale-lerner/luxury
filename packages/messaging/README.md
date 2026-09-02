# @luxury/messaging

The one outbound messaging client, used by both services. Kept out of
`packages/shared` so that an app needing a type does not pull in a channel SDK.

Hard boundaries (CLAUDE.md, DESIGN.md):

- **credentials arrive as a constructor argument.** This package never reads
  `process.env`; each service injects its own
- **the send function takes a `ConversationId`, never a raw address.** The
  destination is resolved from the database by the caller's resolver
- rate limiting, timeout and logging live inside this layer, so every caller
  gets them
- the agent has no send tool at all — code sends, the model does not
