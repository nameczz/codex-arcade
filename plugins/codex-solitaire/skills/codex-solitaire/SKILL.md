---
name: codex-solitaire
description: Open the interactive Codex Solitaire game when the user says 打开纸牌接龙, 玩纸牌接龙, 来一局接龙, start solitaire, play Klondike, play patience, or otherwise clearly asks to launch Solitaire.
---

# Codex Solitaire

Use the `open_solitaire_game` tool immediately when the user asks to open or play 纸牌接龙, Solitaire, Klondike, or Patience.

- Do not replace the game with instructions, source code, web search, or an external game link.
- After the tool returns, briefly tell the user they can click or drag cards; on touch, select a card then tap its destination.
- The table handles draw-one rules, redeals, undo, hints, score, moves, timer, new games, and supported display modes.
- If the tool fails, report its exact error and suggest reinstalling the local plugin. Do not claim the table opened.
