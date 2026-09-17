# Gator

Gator is a command-line RSS feed aggregator built with TypeScript, PostgreSQL, and Drizzle ORM.

It allows multiple users to register, add RSS feeds, follow feeds, collect posts automatically, and browse aggregated posts from the command line.

## Requirements

Before running Gator, make sure you have:

* Node.js 22.15.0
* PostgreSQL
* npm
* Git

## Installation

Clone the repository and enter the project directory:

```bash
git clone <your-repository-url>
cd gator
```

Install the dependencies:

```bash
npm install
```

Make sure PostgreSQL is running.

On Ubuntu/WSL, you can start PostgreSQL with:

```bash
sudo service postgresql start
```

## Configuration

Gator uses a configuration file located at:

```text
~/.gatorconfig.json
```

Create the file with:

```json
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable"
}
```

The `db_url` should point to your PostgreSQL database.

The database should be named `gator`.

## Database Setup

Create the database if it does not already exist:

```bash
createdb gator
```

Then run the database migrations:

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
npm run start register Wafaa
```

### Log in

```bash
npm run start login Wafaa
```

### List users

```bash
npm run start users
```

### Add an RSS feed

```bash
npm run start addfeed "Hacker News" https://hnrss.org/frontpage
```

### List feeds

```bash
npm run start feeds
```

### Follow a feed

```bash
npm run start follow https://hnrss.org/frontpage
```

### Show feeds followed by the current user

```bash
npm run start following
```

### Run the feed aggregator

The `agg` command continuously fetches feeds.

For example:

```bash
npm run start agg 10s
```

The argument specifies how long Gator waits between requests.

Supported duration units include:

* `ms` — milliseconds
* `s` — seconds
* `m` — minutes
* `h` — hours

Press `Ctrl+C` to stop the aggregator.

### Browse posts

After the aggregator has collected posts, browse them with:

```bash
npm run start browse
```

You can also specify how many posts to display:

```bash
npm run start browse 5
```

## Tech Stack

* TypeScript
* Node.js
* PostgreSQL
* Drizzle ORM
* fast-xml-parser
* RSS
* Git / GitHub

## Project Purpose

This project was built as a backend-focused learning project to practice:

* CLI application development
* PostgreSQL database design
* ORM usage with Drizzle
* Database migrations
* SQL relationships and joins
* REST/RSS data processing
* Asynchronous programming
* Background feed aggregation
* TypeScript
	
