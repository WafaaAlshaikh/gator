# Gator 🐊

Gator is a command-line RSS feed aggregator built with TypeScript, PostgreSQL, and Drizzle ORM. It lets multiple users register, add RSS feeds, follow feeds other users have added, collect posts automatically in the background, and browse everything from the terminal.

## Requirements

Before running Gator, make sure you have:

- Node.js 22.15.0 (there's an `.nvmrc` in the repo — run `nvm use` if you have nvm installed)
- PostgreSQL (v16+)
- npm
- Git

## Installation

Clone the repository and enter the project directory:

```bash
git clone https://github.com/WafaaAlshaikh/gator.git
cd gator
```

Install the dependencies:

```bash
npm install
```

Make sure PostgreSQL is running. On Ubuntu/WSL:

```bash
sudo service postgresql start
```

On macOS (with brew):

```bash
brew services start postgresql@16
```

## Configuration

Gator is a multi-user CLI, but there's no server behind it — just a config file that lives in your home directory at:

```text
~/.gatorconfig.json
```

It isn't created automatically, so make it yourself:

```json
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable"
}
```

Swap in your own Postgres credentials. `sslmode=disable` is there because we're connecting locally and don't need SSL. Don't add `current_user_name` yourself — Gator sets that field automatically once you register or log in.

## Database setup

Create the database if it doesn't already exist:

```bash
createdb gator
```

Then run the migrations to set up the tables:

```bash
npx drizzle-kit migrate
```

## Running Gator

Start Gator with:

```bash
npm run start <command> [args...]
```

### Register a user

```bash
npm run start register wafaa
```

### Log in

```bash
npm run start login wafaa
```

### List users

```bash
npm run start users
```

Marks whoever's currently logged in with `(current)`.

### Add an RSS feed

```bash
npm run start addfeed "Hacker News" https://hnrss.org/frontpage
```

This adds the feed and automatically follows it as the current user.

### List all feeds

```bash
npm run start feeds
```

### Follow a feed someone else added

```bash
npm run start follow https://hnrss.org/frontpage
```

### Unfollow a feed

```bash
npm run start unfollow https://hnrss.org/frontpage
```

### See what you're following

```bash
npm run start following
```

### Run the aggregator

```bash
npm run start agg 10s
```

`agg` fetches the least-recently-fetched feed on a repeating loop, and keeps running until you stop it. The argument is how long it waits between fetches — supported units are `ms`, `s`, `m`, and `h` (so `1m` means once a minute).

Leave this running in its own terminal while you use other commands elsewhere. Stop it with `Ctrl+C`. Don't set the interval too aggressively — it's hitting real feeds on the internet.

### Browse posts

Once the aggregator has collected some posts:

```bash
npm run start browse
```

Defaults to 2 posts. You can ask for more:

```bash
npm run start browse 5
```

### Reset (development only)

```bash
npm run start reset
```

Wipes the users table, which cascades and clears out feeds, follows, and posts along with it. Useful for starting fresh locally — not something you'd want in production.

## Tech stack

TypeScript and Node.js on top of PostgreSQL, with Drizzle ORM handling queries and migrations and fast-xml-parser parsing the RSS feeds. Commands are dispatched through a small hand-rolled registry rather than a CLI framework, with a `middlewareLoggedIn` wrapper so commands that need a logged-in user don't each repeat the same check.
