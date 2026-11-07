#!/usr/bin/env bash
# 兼容安装入口：准备 Linux VPS；启动由 start-vps.sh 单独完成。
set -euo pipefail
exec "$(dirname "$0")/setup-vps.sh" "$@"
