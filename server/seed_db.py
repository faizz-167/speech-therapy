import asyncio
import json
import os
from sqlalchemy import text
from database import engine

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

async def run():
    async with engine.begin() as conn:
        for file in ORDER:
            filepath = os.path.join("data", file)
            if not os.path.exists(filepath):
                print(f"Skipping {file}, not found.")
                continue
                
            with open(filepath, 'r', encoding='utf-8') as f:
                content = json.load(f)
            
            table_name = content.get("table", file.replace('.json', ''))
            records = content.get("data", [])
            if not records:
                continue
                
            print(f"Loading {len(records)} records into {table_name}...")
            
            # Get valid columns for the table
            col_query = text("SELECT column_name FROM information_schema.columns WHERE table_name = :t")
            valid_cols_result = await conn.execute(col_query, {"t": table_name})
            valid_cols = set(r[0] for r in valid_cols_result)
            
            for row in records:
                # Build insert
                cols = [k for k in row.keys() if k in valid_cols]
                vals = []
                for k in cols:
                    val = row[k]
                    if isinstance(val, (dict, list)):
                        val = json.dumps(val)
                    if val is None:
                        vals.append("NULL")
                    elif isinstance(val, bool):
                        vals.append("TRUE" if val else "FALSE")
                    elif isinstance(val, (int, float)):
                        vals.append(str(val))
                    else:
                        # Escape single quotes
                        escaped = str(val).replace("'", "''")
                        vals.append(f"'{escaped}'")
                
                col_names = ", ".join(cols)
                val_str = ", ".join(vals)
                
                query = text(f"INSERT INTO {table_name} ({col_names}) VALUES ({val_str}) ON CONFLICT DO NOTHING")
                
                await conn.execute(query)
                
        print("Done seeding master data.")

if __name__ == "__main__":
    asyncio.run(run())
