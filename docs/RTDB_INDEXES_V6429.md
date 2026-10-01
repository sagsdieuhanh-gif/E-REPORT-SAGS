# V6.4.29 RTDB indexes

This is an **index fragment**, not a replacement for the project's existing Realtime Database Security Rules.
Merge only the `.indexOn` entries into the existing rules and keep all current `.read`, `.write` and `.validate` rules unchanged.

```json
{
  "rules": {
    "roster_mail": {
      "$uid": {
        "items": {
          ".indexOn": ["opDate"]
        }
      }
    },
    "closeouts": {
      ".indexOn": ["eventAtMs"]
    },
    "cross_state": {
      ".indexOn": ["updatedAtMs"]
    },
    "closeout_events_v440": {
      ".indexOn": ["expiresAtMs"]
    }
  }
}
```

Queries requiring these indexes in V6.4.29:
- `roster_mail/$uid/items.orderByChild("opDate")`
- `closeouts.orderByChild("eventAtMs")`
- `cross_state.orderByChild("updatedAtMs")`
- `closeout_events_v440.orderByChild("expiresAtMs")`

Do not replace production rules with this file. It intentionally contains no authorization rules.
