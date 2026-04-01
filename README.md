# TapKit Plugin for OpenClaw

Control a physical iPhone from OpenClaw. Take screenshots, tap, swipe, type, and navigate apps — all through natural language.

## Installation

```bash
openclaw plugins install tapkit-openclaw
```

Then configure your API key:

```jsonc
// In your OpenClaw plugin config
{
  "plugins": {
    "entries": {
      "tapkit": {
        "enabled": true,
        "config": {
          "apiKey": "tk_your_api_key_here"
        }
      }
    }
  }
}
```

Or set the environment variable:

```bash
export TAPKIT_API_KEY=tk_your_api_key_here
```

## What You Get

The **tapkit** plugin connects OpenClaw to a real iPhone via [TapKit](https://tapkit.ai). Once installed, you can tell your agent things like:

- "Take a screenshot of my phone"
- "Open Settings and turn on Do Not Disturb"
- "Order my usual from Uber Eats"
- "Check the weather in Tokyo"
- "Send a message on Telegram"

### Tools

The plugin registers 22 native OpenClaw tools:

| Tool | Description |
|------|-------------|
| `tapkit_screenshot` | Capture the current screen |
| `tapkit_tap` | Tap at coordinates |
| `tapkit_double_tap` | Double-tap at coordinates |
| `tapkit_long_press` | Long press at coordinates |
| `tapkit_swipe` | Swipe in a direction |
| `tapkit_drag` | Drag from one point to another |
| `tapkit_hold_and_drag` | Hold then drag |
| `tapkit_copy_text_to_phone` | Copy text to the phone's clipboard for pasting |
| `tapkit_open_app` | Open an app by name |
| `tapkit_spotlight` | Search via Spotlight |
| `tapkit_press_home` | Go to the home screen |
| `tapkit_lock` / `tapkit_unlock` | Lock or unlock the device |
| `tapkit_volume_up` / `tapkit_volume_down` | Adjust volume |
| `tapkit_activate_siri` | Trigger Siri |
| `tapkit_run_shortcut` | Run a Siri Shortcut |
| `tapkit_escape` | Dismiss modals and keyboards |
| `tapkit_enable_switch_control` | Enable Switch Control accessibility |
| `tapkit_list_phones` / `tapkit_select_phone` | Manage connected devices |
| `tapkit_get_phone_info` | Get device details |

### Slash Command

- `/tapkit` — Show connection status, API key, and connected phones

### Skills

The plugin includes 11 skills that teach the agent how to navigate specific apps:

| Skill | Description |
|-------|-------------|
| **tapkit** | Core iPhone control — gestures, screenshots, typing, and navigation patterns |
| **clock** | Set alarms, timers, stopwatch, and world clocks |
| **facebook** | Browse feed, Marketplace, Reels, groups, and messaging |
| **hinge** | Browse profiles, send likes and roses, message matches |
| **instagram** | Browse feed, Reels, stories, DMs, and profile management |
| **linkedin** | Browse feed, connect with people, search jobs, and messaging |
| **telegram** | Send messages, browse chats, join groups, and interact with bots |
| **tiktok** | Browse For You feed, like and comment on videos, follow creators |
| **twitter** | Browse feed, compose posts, create threads and polls |
| **uber-eats** | Search restaurants, browse menus, and place delivery orders |
| **weather** | Check forecasts, air quality, UV index, and manage saved cities |

## How It Works

```
OpenClaw Agent  →  TapKit REST API  →  Physical iPhone
    (you)          (api.tapkit.ai)      (your device)
```

The agent sees the phone screen through screenshots and interacts through tap/swipe/type commands. The core loop is always: **screenshot → look → act → screenshot to verify**.

This is a native OpenClaw plugin — tools run in-process with the Gateway, no MCP overhead.

## Requirements

- [OpenClaw](https://openclaws.io) v2026.3.24 or later
- A TapKit account at [tapkit.ai](https://tapkit.ai)
- A connected iPhone

## Also Available

- **Claude Code**: [tapkit-plugins-claude](https://github.com/Jootsing-Research/tapkit-plugins-claude)

## License

MIT

## Author

[Jootsing Research](https://jootsing.ai) — tj@jootsing.ai
