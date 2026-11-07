"""Read-only preflight for the same PostgreSQL config used by ARTEX."""
import json
import sys
from urllib.parse import urlparse

import psycopg2

with open(sys.argv[1]) as config_file:
    database = json.load(config_file).get("database", {})
dsn = database.get("dsn", "").strip()
if dsn:
    hostname = urlparse(dsn).hostname or ""
    if "-pooler" in hostname and hostname.endswith(".neon.tech"):
        sys.exit("Neon 请使用 Direct connection；ARTEX 的启动迁移需要会话锁。")
    connection_args = {"dsn": dsn}
else:
    connection_args = {
        key: value for key, value in database.items()
        if key in ("host", "port", "user", "password", "dbname", "sslmode")
        and value not in ("", None)
    }
    if not connection_args:
        sys.exit("数据库配置为空，请填写 /etc/artex/config.json。")
try:
    with psycopg2.connect(**connection_args, connect_timeout=10) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1, has_schema_privilege(current_user, current_schema(), 'CREATE')")
            _, can_create = cursor.fetchone()
            if not can_create:
                sys.exit("数据库可连接，但当前角色没有 schema 建表权限。")
except psycopg2.Error:
    sys.exit("PostgreSQL 检查失败，请检查连接串、TLS、网络和数据库权限。")
print("PostgreSQL 检查通过。")
