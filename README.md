# Codex Arcade

一个可直接加入 Codex 的本地游戏插件市场。目前包含三款无需网络、无需第三方运行时资源的 MCP App：

- **Codex Brick Breaker**：原创「Codex Neon Workshop」打砖块。3 条命、积分与最佳成绩、特殊砖块、连续击破反馈、3 种以上关卡布局，以及键盘、鼠标、触摸控制。
- **Codex Snake**：原创贪吃蛇，支持键盘、触摸、暂停、重开与最佳成绩。
- **Codex Solitaire**：原创「Codex Felt Atelier」纸牌接龙。完整 draw-one Klondike 规则，支持点击、拖放、移动端两步选择、撤销、提示、计时、步数和得分。

所有图形均由 Codex 以 Canvas、CSS、SVG 和本地渲染 PNG 创作。运行时不加载远程字体、图片或第三方游戏资源。

## 本地安装

需要已安装并可运行的 `codex` CLI。在仓库根目录执行：

```bash
codex plugin marketplace add "$(pwd)"
codex plugin add codex-brick-breaker@codex-arcade
codex plugin add codex-snake@codex-arcade
codex plugin add codex-solitaire@codex-arcade
```

也可以使用安装脚本：

```bash
./scripts/install-local.sh brick
./scripts/install-local.sh snake
./scripts/install-local.sh solitaire
./scripts/install-local.sh all
./scripts/install-local.sh both  # 兼容旧参数，等同 all
```

安装后新建一个 Codex 任务，输入 `打开打砖块`、`打开贪吃蛇` 或 `打开纸牌接龙`。新任务能确保 Codex 载入最新的技能和 MCP 工具。

## 将来从 GitHub 安装

本仓库当前只是本地仓库，尚未创建或发布远程 GitHub 仓库。将来推送到 GitHub 后，可使用实际仓库地址：

```bash
codex plugin marketplace add owner/repo --ref main
codex plugin add codex-brick-breaker@codex-arcade
```

请把 `owner/repo` 替换成届时真实存在的 GitHub 仓库；当前不要把这条命令当成已发布链接。

## 操作

| 游戏 | 键盘 | 鼠标 / 触摸 |
| --- | --- | --- |
| 打砖块 | `←` `→` 或 `A` `D` 移动；`Space` 发射、暂停/继续；`R` 重开 | 在游戏区移动或拖动挡板；底部有可见触摸按钮 |
| 贪吃蛇 | 方向键或 WASD；`Space` 暂停；`R` 重开 | 滑动或使用方向按钮 |
| 纸牌接龙 | `⌘/Ctrl+Z` 撤销；`H` 提示；`N` 新局 | 点击或拖放；移动端先选择源牌，再点目标牌堆 |

支持时，三款游戏都可以向 Codex 请求画中画或全屏；不支持时会在界面内给出提示，不影响内联游戏。

## 仓库结构

```text
.agents/plugins/marketplace.json   # codex-arcade 市场清单
plugins/codex-brick-breaker/       # 打砖块插件、MCP 服务、技能、资源、测试
plugins/codex-snake/               # 贪吃蛇插件、MCP 服务、技能、资源、测试
plugins/codex-solitaire/           # 纸牌接龙插件、MCP 服务、技能、资源、测试
scripts/install-local.sh           # 安全的本地安装入口
```

## 验证

```bash
node --check plugins/codex-brick-breaker/mcp/server.cjs
node --check plugins/codex-brick-breaker/mcp/game-core.js
node --test plugins/codex-brick-breaker/tests/*.test.cjs
node --test plugins/codex-snake/tests/*.test.cjs
node --test plugins/codex-solitaire/tests/*.test.cjs

python3 /path/to/plugin-creator/scripts/validate_plugin.py plugins/codex-brick-breaker
python3 /path/to/plugin-creator/scripts/validate_plugin.py plugins/codex-snake
python3 /path/to/plugin-creator/scripts/validate_plugin.py plugins/codex-solitaire
python3 /path/to/skill-creator/scripts/quick_validate.py plugins/codex-brick-breaker/skills/codex-brick-breaker
python3 /path/to/skill-creator/scripts/quick_validate.py plugins/codex-solitaire/skills/codex-solitaire
```

插件服务通过 stdio 使用 JSON-RPC/MCP 协议。HTML 游戏资源为 `text/html;profile=mcp-app`，在服务返回时会内联所有运行所需代码与图标。

## License

[MIT](./LICENSE)
