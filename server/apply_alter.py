import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL").replace("+asyncpg", "").replace("ssl=require", "sslmode=require")

def apply_alter():
    conn = psycopg2.connect(db_url)
    try:
        with conn:
            with conn.cursor() as cur:
                with open("migrations/alter_v2.sql", "r", encoding="utf-8") as f:
                    sql = f.read()
                cur.execute(sql)
                print("Successfully applied alter_v2.sql")
    except Exception as e:
        print(f"Failed to apply alter_v2.sql: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    apply_alter()
