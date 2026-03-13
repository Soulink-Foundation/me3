# me3 Protocol (me.json)

**The place machines check before acting on a person.**

`me.json` is a minimal protocol that lets you declare what actions AI agents and services can take on your behalf—and how.

## The Problem

Machines are already making decisions about people:

- "Should I book a meeting with this person?"
- "Can I subscribe them to updates?"
- "How should I introduce them?"

Without an authoritative source, they guess. They scrape. They get it wrong.

Schema.org describes _pages_. `me.json` declares _people_—their identity, their preferences, and their **intents**.

## The Solution: Intents, Services, and Actions

The core of `me.json` is a machine-readable contract:

- `intents` declare what is possible
- `services` describe the offers a person provides
- `actions` make invocation explicit for agents

Example:

```json
{
  "version": "0.1",
  "name": "Jane Doe",
  "bio": "Creative Director at Studio X",
  "services": [
    {
      "id": "discovery-call",
      "title": "Discovery Call",
      "description": "A first conversation to explore fit.",
      "sessionType": "1:1",
      "duration": 30,
      "price": 0,
      "currency": "EUR",
      "whoItsFor": ["founders", "coaches"],
      "outcomes": ["clarity", "next steps"],
      "availabilityMode": "calendar",
      "status": "active"
    }
  ],
  "intents": {
    "subscribe": {
      "enabled": true,
      "title": "Design Weekly",
      "description": "Curated design links every Sunday",
      "frequency": "weekly"
    },
    "book": {
      "enabled": true,
      "title": "30-min Consultation",
      "description": "Let's discuss your project",
      "duration": 30,
      "url": "https://cal.com/janedoe"
    }
  },
  "actions": {
    "subscribe": {
      "method": "POST",
      "url": "https://api.example.com/subscribe",
      "requires": ["email"]
    },
    "checkAvailability": {
      "method": "GET",
      "url": "https://api.example.com/book/janedoe/slots{?date}",
      "requires": ["date"]
    }
  }
}
```

**Without `me.json`**: An AI asked "Can I book a call with Jane?" has to guess, scrape her site, or fail.

**With `me.json`**: The AI reads `intents.book`, sees the relevant `services`, and can use `actions.checkAvailability` or `actions.subscribe` directly.

That's the protocol's value: **authority before action**.

## Supported Intents

| Intent      | Purpose                      | Key Fields                                           |
| :---------- | :--------------------------- | :--------------------------------------------------- |
| `subscribe` | Newsletter/updates signup    | `enabled`, `title`, `description`, `frequency`       |
| `book`      | Meeting/consultation booking | `enabled`, `title`, `description`, `url`, `duration` |

More intents (like `contact` for routing preferences) are planned.

## Structured Services

`services` helps agents explain fit before taking action.

| Field | Purpose |
| :---- | :------ |
| `id` | Stable identifier for the service |
| `title` | Human-facing service name |
| `description` | Short summary of the offer |
| `sessionType` | Delivery type such as `1:1` or `group` |
| `duration` | Session length in minutes |
| `price` / `currency` | Pricing metadata |
| `whoItsFor` | Audience descriptors |
| `outcomes` | Expected benefits or next steps |
| `availabilityMode` | How availability is managed |
| `status` | Whether the service is currently active |

## Explicit Actions

`actions` lets a profile describe exactly how an agent should invoke something.

| Field | Purpose |
| :---- | :------ |
| `method` | HTTP method such as `GET` or `POST` |
| `url` | Endpoint URL |
| `requires` | Fields an agent must gather before calling |
| `description` | Human-readable action summary |

---

## Full Schema

Beyond intents, `me.json` includes identity and presentation fields:

| Field      | Type     | Required | Description                                          |
| :--------- | :------- | :------- | :--------------------------------------------------- |
| `version`  | `string` | **Yes**  | Protocol version (currently `"0.1"`).                |
| `name`     | `string` | **Yes**  | Display name.                                        |
| `handle`   | `string` | No       | Preferred username/handle.                           |
| `bio`      | `string` | No       | Short bio (max 500 chars).                           |
| `avatar`   | `string` | No       | Profile picture URL.                                 |
| `banner`   | `string` | No       | Header/banner image URL.                             |
| `location` | `string` | No       | Freeform location (e.g., "Berlin" or "Remote").      |
| `links`    | `object` | No       | Social links (`website`, `github`, `twitter`, etc.). |
| `buttons`  | `array`  | No       | Call-to-action buttons for human visitors.           |
| `pages`    | `array`  | No       | Custom content pages (markdown).                     |
| `services` | `array`  | No       | Structured services or offerings for agents.         |
| `intents`  | `object` | No       | Machine-actionable declarations (see above).         |
| `actions`  | `object` | No       | Explicit action descriptors for agents.              |
| `footer`   | `object` | No       | Footer config (or `false` to hide).                  |

See [`examples/full.json`](./examples/full.json) for a complete example.

---

## Hosting & Discovery

Your `me.json` must be publicly accessible at:

1. **Primary**: `https://yourdomain.com/me.json`
2. **Fallback**: `https://yourdomain.com/.well-known/me`

### Requirements

- **HTTPS only**
- **CORS enabled**: Serve with `Access-Control-Allow-Origin: *` so browser-based agents can read it
- **Content-Type**: `application/json`

---

## What me.json is NOT

- **NOT authentication** — This is public data. No logins, no private keys.
- **NOT a social network** — No feeds, no likes, no central server.
- **NOT a platform** — Host it anywhere: GitHub Pages, Vercel, your own server.
- **NOT reputation** — No scores, rankings, or verification.

---

## Usage

### Install

```bash
npm install me3-protocol
```

### Validate

```typescript
import { validateProfile, parseMe3Json } from "me3-protocol";

const result = validateProfile(profileData);

if (!result.valid) {
  console.error(result.errors);
}
```

### JSON Schema

A standard JSON Schema is available at [`schema.json`](./schema.json).

---

## Versioning

- **Current version**: `0.1`
- **Stability**: Additive changes only. Breaking changes require a version bump.
- **Extensions**: Custom fields should go under `links` until the protocol defines extension points.
