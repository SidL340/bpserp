import sqlite3
import json
import os

db_path = os.path.join(os.path.dirname(__file__), 'prisma', 'dev.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%';")
tables = [row[0] for row in cursor.fetchall()]

data = {}
for table in tables:
    cursor.execute(f'SELECT * FROM "{table}";')
    rows = [dict(row) for row in cursor.fetchall()]
    data[table] = rows
    if len(rows) > 0:
        print(f" - {table}: {len(rows)} records")

out_file = os.path.join(os.path.dirname(__file__), 'sqlite_dump.json')
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, default=str)

print(f"Exported {len(tables)} tables to {out_file}")
conn.close()
