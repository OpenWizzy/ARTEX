#!/usr/bin/env bash
# 复用依赖，重新编译并部署 Go 后端与静态前端；不会自动重启运行中的任务。
set -euo pipefail
"$(dirname "$0")/setup-vps.sh" --skip-deps "$@"
printf '更新已准备好；运行 sudo ./start-vps.sh 检查并重启服务。\n'
