#!/usr/bin/env bash
# 检查 VPS 构建产物、工具、数据库和端口，通过后启动 Go + Caddy。
set -euo pipefail
info(){ printf '[*] %s\n' "$*"; }
die(){ printf '错误：%s\n' "$*" >&2; exit 1; }
check_only=0
case "${1:-}" in
  --check-only) check_only=1 ;;
  -h|--help) echo "用法：sudo ./start-vps.sh [--check-only]"; exit 0 ;;
  "") ;;
  *) die "未知参数：$1" ;;
esac
[ "$#" -le 1 ] || die "参数过多"
[ "$(uname -s)" = Linux ] || die "本脚本用于 Linux VPS"
[ "$(id -u)" -eq 0 ] || die "请使用 sudo 运行"
[ -d /run/systemd/system ] || die "需要 systemd"
[ -r /etc/artex/runtime.env ] || die "请先运行 setup-vps.sh"
set -a
. /etc/artex/runtime.env
set +a
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

info "检查工具、构建产物和服务配置…"
for tool in go node npm npx python3 psql caddy nmap playwright playwright-cli playwright-mcp \
  curl wget git jq unzip rsync rg vim dig ping nc telnet whois runuser ss; do
  command -v "$tool" >/dev/null || die "缺少工具：$tool"
done
[ -x /opt/artex/artex ] || die "缺少 Go 二进制"
[ -s /var/www/artex/index.html ] || die "缺少前端静态文件"
[ -d /opt/artex/skills ] || die "缺少 skills"
[ -s /etc/artex/site ] || die "缺少站点地址配置"
[ -r /etc/systemd/system/artex.service ] && [ -r /etc/systemd/system/artex-web.service ] || die "缺少 systemd 单元"
runuser -u artex -- /opt/artex/artex -h >/dev/null 2>&1 || die "Go 二进制无法执行"
runuser -u caddy -- test -r /etc/artex/web/Caddyfile || die "Caddy 无法读取站点配置"
runuser -u caddy -- test -r /var/www/artex/index.html || die "Caddy 无法读取前端"
runuser -u artex -- test -w /var/lib/artex || die "artex 用户无法写入数据目录"
caddy validate --config /etc/artex/web/Caddyfile --adapter caddyfile
info "检查 PostgreSQL 连通性与建表权限…"
runuser -u artex -- python3 /opt/artex/check_database.py "$ARTEX_CONFIG"
info "以 artex 用户实际启动一次无头 Chromium…"
runuser -u artex -- node /opt/artex/check_browser.cjs
runuser -u artex -- playwright-cli --help >/dev/null
runuser -u artex -- playwright-mcp --help >/dev/null

# 已有 ARTEX 服务可以重启；其他进程占用端口时，在改变任何服务前退出。
site="$(cat /etc/artex/site)"
port_checks=('artex:8787' 'artex:8788' 'artex-web:80')
if [ "$site" != :80 ]; then port_checks+=('artex-web:443'); fi
for entry in "${port_checks[@]}"; do
  unit="${entry%:*}"
  port="${entry#*:}"
  if ! systemctl is-active --quiet "$unit" && ss -H -ltn "sport = :$port" | grep . >/dev/null; then
    die "端口 $port 被其他服务占用，请先处理冲突"
  fi
done
[ "$check_only" -eq 0 ] || { info "全部检查通过（未启动或重启任何服务）"; exit 0; }

info "启动 Go 后端…"
systemctl enable artex artex-web
systemctl restart artex
ready=0
for attempt in $(seq 1 30); do
  if curl --noproxy '*' -fsS --max-time 2 http://127.0.0.1:8787/api/health >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[ "$ready" -eq 1 ] || die "后端未就绪，请查看 journalctl -u artex -n 80"

info "启动 Caddy 并检查前端与 API…"
systemctl restart artex-web
if [ "$site" = :80 ]; then
  site_url=http://127.0.0.1
  curl_args=(--noproxy '*')
else
  site_url="https://$site"
  curl_args=(--noproxy '*' --resolve "$site:443:127.0.0.1")
fi
curl -fsS --retry 5 --retry-all-errors --retry-delay 2 --max-time 10 \
  "${curl_args[@]}" "$site_url/api/health" \
  | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("ok") else 1)'
curl -fsS --max-time 10 "${curl_args[@]}" "$site_url/login" | grep -i '<!doctype html' >/dev/null
info "启动完成：${site_url}（默认 HTTP 模式从外部使用 VPS 的 IP 访问）"
info "日志：journalctl -u artex -u artex-web -f"
