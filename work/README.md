# work/ — development tasks

One file per task, flat, named `NNNN-short-slug.md`. State lives in the
`status:` field, not in the path. Start from [TEMPLATE.md](TEMPLATE.md).

```markdown
---
status: todo | doing | done | dropped
opened: 2026-09-08
---
```

## Why not folders per status

Moving a file between `todo/` and `doing/` makes the path the state. Two
branches that move the same task in different directions produce a
rename/rename conflict, which is the one thing git resolves badly, and the
file's history breaks at every move. A flat directory with a field gives the
same view for one grep and merges as a one-line change.

```bash
grep -l 'status: doing' work/*.md
```

## Why not Jira

Jira earns its place when people who do not read the repo need to receive
work. Today that is nobody: a task here is closed by a commit, and living in
the same diff as the code that closes it is worth more than a board.

This changes the day non-developers — cleaning, front desk — need to be
assigned work. That is not this directory: guest service requests are already
modelled in `public.tasks` with a screen on the admin side. They are operational
data, not development tasks.

## Not to be confused with `public.tasks`

`public.tasks` (migrations/0002_core_tables.sql) is the runtime queue the bot
writes into and the admin side pulls from. It has nothing to do with this
directory beyond the word. That collision is why this folder is `work/`.

## What belongs in a task file

The body carries the reasoning, not a title restated: what the problem is,
what was decided and why, and what is still open. A task that is only a
heading does not need a file.
