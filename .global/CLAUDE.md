# DevBot

- Never restart DevBot without explicit user permission (no `kill`, no `tmux send-keys C-c`, no manual `npm run dev`). Active Claude workers and chats will be dropped.
- The only safe restart is `make start` from the DevBot repo root. Run it in an external Terminal so this session survives — resolve the repo root with `git rev-parse --show-toplevel` from any path inside the repo:
  ```bash
  REPO=$(git rev-parse --show-toplevel) && osascript -e "tell application \"Terminal\" to do script \"cd $REPO && make start\"" -e 'tell application "Terminal" to activate'
  ```
