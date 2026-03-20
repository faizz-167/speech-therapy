import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL").replace("+asyncpg", "").replace("ssl=require", "sslmode=require")

def apply_schema():
    conn = psycopg2.connect(db_url)
    try:
        with conn:
            with conn.cursor() as cur:
                with open("schema.sql", "r", encoding="utf-8") as f:
                    sql = f.read()
                cur.execute(sql)
                print("Successfully applied schema.sql")
    except Exception as e:
        print(f"Failed to apply schema: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    apply_schema()
