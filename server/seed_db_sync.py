import psycopg2
from psycopg2.extras import Json
import json
import os
from dotenv import load_dotenv

load_dotenv()

ORDER = [
    "defect.json",
    "baseline_assessment.json",
    "baseline_section.json",
    "baseline_item_v2.1.json",
    "baseline_defect_mapping.json",
    "task.json",
    "task_level.json",
    "prompt.json",
    "evaluation_target.json",
    "speech_target.json",
    "prompt_scoring.json",
    "adaptive_threshold.json",
    "feedback_rule.json",
    "task_defect_mapping.json"
]

def run():
    db_url = os.environ["DATABASE_URL"].replace("+asyncpg", "")
    if "?ssl=require" in db_url:
        db_url = db_url.replace("?ssl=require", "")
    conn = psycopg2.connect(db_url, sslmode="require")
    cur = conn.cursor()
    
    for file in ORDER:
        filepath = os.path.join("data", file)
        if not os.path.exists(filepath):
            print(f"Skipping {file}, not found.")
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = json.load(f)
        
        table_name = content.get("table", file.replace('.json', '').replace('_v2.1', ''))
        records = content.get("data", [])
        if not records:
            continue
            
        # Get valid columns for this table
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table_name,))
        valid_cols = set(r[0] for r in cur.fetchall())
        
        # Get JSONB columns for this table
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = %s AND data_type = 'jsonb'", (table_name,))
        jsonb_cols = set(r[0] for r in cur.fetchall())
        
        print(f"Loading {len(records)} records into {table_name}...")
        
        for row in records:
            cols = [k for k in row.keys() if k in valid_cols]
            if not cols:
                continue
            vals = []
            for k in cols:
                val = row[k]
                # Wrap ALL values for JSONB columns through Json() adapter
                if k in jsonb_cols:
                    vals.append(Json(val))
                else:
                    vals.append(val)
            
            col_names = ", ".join(cols)
            placeholders = ", ".join(["%s"] * len(cols))
            
            query = f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
            cur.execute(query, vals)
            
    conn.commit()
    cur.close()
    conn.close()
    print("Done seeding master data.")

if __name__ == "__main__":
    run()
