# Kidoclassic store, setup

## 1. Install

```bash
npm install
```

`postinstall` runs `prisma generate`, so the client is built for you.

## 2. Environment

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` and `ADMIN_SECRET`. `.env` is gitignored; `.env.example`
is the committed template. Never commit real credentials.

## 3. Database

The store runs on **MySQL on Hostinger**. In hPanel under Databases, MySQL
Databases, create **two** empty databases: the real one, and a second one for
Prisma to use as a shadow database. `migrate dev` rebuilds the schema in a
throwaway database to diff against, and shared hosting will not let it create
that database itself, so you hand it one. The shadow database is only needed on
your machine; leave `SHADOW_DATABASE_URL` unset in the panel.

Never point either variable at the WordPress database. `migrate dev` will offer
to reset a database whose contents it does not recognise, and the live store
lives in that one.

Use `localhost` as the host once the app is deployed, since the Node app and the
database sit on the same plan. To run migrations from your laptop, add your IP
under Remote MySQL first and use the server hostname instead.

```bash
npx prisma migrate dev --name init
npx prisma studio        # a GUI to eyeball your data while you build
```

### A local database while you build

Developing against Hostinger means every query crosses the internet and every
mistake lands in the real database. A throwaway MySQL in Docker avoids both:

```bash
docker start kido-mysql     # already created; use `docker stop` when done
```

It listens on port **3307**, not 3306, so it cannot collide with anything else
running locally. The `.env` in this repo points at it. Swap in the Hostinger URL
when you want to migrate the real thing.

Fill it with test products, enough to exercise every state the storefront can
render — discounted and undiscounted, sold out, draft, letter and numeric sizes:

```bash
node --env-file=.env prisma/seed.ts
```

Rerunning it replaces those products by slug and leaves anything else alone.

Two things that will not match older Prisma tutorials:

- Connection URLs live in `prisma.config.ts`, not in `schema.prisma` — Prisma 7
  removed `url = env(...)` from the datasource block.
- The app connects through the `@prisma/adapter-mariadb` driver adapter set up
  in `lib/prisma.ts`. An adapter is now required rather than optional. The
  MariaDB adapter is the right one for MySQL.
- Keep `DATABASE_URL` in the `mysql://` form. Prisma's migrate engine needs that
  scheme, but the mariadb driver parses `mariadb://` and nothing else, so
  `lib/prisma.ts` rewrites it. Writing `mariadb://` in `.env` breaks migrations.

MySQL has no array column, so `Product.images` is a JSON array of URLs. Read it
with `imageList()` from `lib/format.ts` rather than casting it by hand.

## 4. Get into the admin

The admin gate reads a `kido_admin` cookie and compares it to `ADMIN_SECRET`.
In development with no `ADMIN_SECRET` set, it lets you straight through.

Visit `/admin/products/new` and add your first product.

## 5. Deploy to Hostinger

1. Push the repo to GitHub.
2. hPanel, Websites, Node.js Apps, Import Git Repository.
3. Pick Node 20 or 22, framework Next.js.
4. Add `DATABASE_URL` and `ADMIN_SECRET` as environment variables in the panel.
   The build itself does not need them — `lib/prisma.ts` builds its client on
   first query rather than on import, so `next build` never asks for
   credentials. Keep it that way: anything read at module scope in a page turns
   into a build-time requirement, and the build host has no database.
5. Point a subdomain at it, `new.kidoclassicmall.com`, while you build.

Every push to the main branch rebuilds. Leave the WooCommerce site on the main
domain until this one is proven.

## Build order from here

1. **Storefront listing and product page.** Read published products, show the
   size selector from the variants.
2. **Cart.** Cookie-backed `sessionId` for guests, upgraded to a `userId` on login.
3. **Checkout and ALAT Pay.** Three rules, non-negotiable:
   - Compute the total server-side from `priceKobo` in your own database.
     Never accept a total or price from the browser.
   - Confirm payment in the ALAT Pay **webhook**, not in the redirect back to
     your site. A redirect can be faked; a signed webhook cannot.
   - Decrement `stock` inside a transaction at the moment payment confirms, and
     re-check availability there. Otherwise two customers buy the same last
     size 38.
4. **Orders admin.** List, mark fulfilled, see what sold.
5. **Real auth.** Replace `lib/auth.ts`. Until then the admin is protected by a
   single shared secret, which is fine for building and not fine for a live store.

## Migrating from WooCommerce

Export products from WooCommerce as CSV (Products, Export). Write a one-off
script that reads it and creates `Product` and `ProductVariant` rows. Do this
last, once the storefront works, so you are not migrating into a moving target.
