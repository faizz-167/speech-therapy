import sqlite3
import traceback

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()
try:
    cursor.execute("ALTER TABLE patients DROP COLUMN disorder_type")
    print("Dropped disorder_type")
except Exception as e:
    print(f"Error dropping disorder_type: {e}")

try:
    cursor.execute("ALTER TABLE patients DROP COLUMN therapy_goals")
    print("Dropped therapy_goals")
except Exception as e:
    print(f"Error dropping therapy_goals: {e}")

conn.commit()
conn.close()
print("Done migrating db.")
