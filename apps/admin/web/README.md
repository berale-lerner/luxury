# apps/admin/web

React + Vite SPA, served as a static asset by `../server`: one deployment, one
URL, one origin — no CORS and a same-origin cookie.

`web/` has no database role, no credentials and no secrets. Every piece of data
reaches it through `server/`'s API.

Not scaffolded yet — it lands with the first screen that needs it.
