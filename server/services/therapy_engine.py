"""
Therapy Engine — AI-driven therapy plan generation using the structured defect logic.
Uses baseline scores, patient diagnosis, and the therapy task library
to generate a personalized weekly plan, based on selected defects and approved tasks.
"""
import random
import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_therapy_plan(patient, baseline, approved_task_ids):
    """
    Generate a weekly therapy plan based on:
    - Patient diagnosis and severity
    - Baseline assessment scores
    - Approved tasks from the defect mappings
    
    Returns (plan_data: list, reasoning: str)
    """
    selected_defects = getattr(patient, 'selected_defects', []) or []
    if not selected_defects:
        return [], "No defects selected for this patient."
    
    # Fall back to patient's stored approved_task_ids if none passed
    if not approved_task_ids:
        approved_task_ids = getattr(patient, 'approved_task_ids', []) or []
    if not approved_task_ids:
        return [], "No tasks were approved by the therapist."

    # Convert all IDs to comparable types (strings)
    approved_str = [str(t) for t in approved_task_ids]

    accuracy = baseline.accuracy if baseline else 0
    is_child = patient.category == "child"
    
    # Calculate starting level constraint
    if is_child:
        if accuracy < 60:
            target_level = "easy"
        elif accuracy <= 75:
            target_level = "medium"
        else:
            target_level = "advanced"
    else:
        if accuracy < 80:
            target_level = "easy"
        elif accuracy <= 90:
            target_level = "medium"
        else:
            target_level = "advanced"

    # Load task mappings — structure: { "mappings": [ { "defect_id": ..., "tasks": [...] } ] }
    mappings_file = "child_task_mapping.json" if is_child else "adult_task_mapping.json"
    mappings_data = load_json(mappings_file)
    mappings = mappings_data.get("mappings", mappings_data) if isinstance(mappings_data, dict) else mappings_data

    # Load defects for names
    defects_file = "child_defects.json" if is_child else "adult_defects.json"
    defects_data = load_json(defects_file)
    defects_list = defects_data if isinstance(defects_data, list) else defects_data.get("defects", [])
    defect_names = {d["defect_id"]: d["defect_name"] for d in defects_list}
    
    plan_tasks = []
    reasoning_parts = []
    
    # Match tasks using defect_id
    for mapping in mappings:
        defect_id = mapping.get("defect_id", "")
        if defect_id not in selected_defects:
            continue
        
        defect_name = defect_names.get(defect_id, defect_id)
        reasoning_parts.append(f"Addressed defect {defect_name}.")
        
        # Tasks are in mapping["tasks"], each has levels as a dict: { "easy": {...}, "medium": {...}, "advanced": {...} }
        for ttask in mapping.get("tasks", []):
            task_id_str = str(ttask.get("task_id", ""))
            if task_id_str not in approved_str:
                continue
            
            levels = ttask.get("levels", {})
            level_data = levels.get(target_level, {})
            
            if level_data:
                prompts = level_data.get("prompts", [])
                plan_tasks.append({
                    "therapy_task_id": ttask.get("task_id"),
                    "task_name": ttask.get("task_name", ""),
                    "category": ttask.get("task_type", ttask.get("category", "")),
                    "difficulty": target_level,
                    "interaction_type": ttask.get("task_type", ""),
                    "prompts": prompts,
                    "difficulty_score": level_data.get("difficulty_score", 1),
                    "reason": f"Targets {defect_name} at {target_level} level."
                })

    if not plan_tasks:
        return [], "No approved tasks matched the selected defects or required level."

    # Calculate registration day (1=Monday...7=Sunday)
    # Default to 1 if patient object doesn't have created_at loaded
    registration_day = patient.created_at.isoweekday() if hasattr(patient, 'created_at') and patient.created_at else 1

    # Build plan data from registration_day to 7 (Sunday)
    final_plan_data = []
    for day in range(registration_day, 8):
        # assign 2 tasks per day randomly from the pool
        daily_selection = random.sample(plan_tasks, min(2, len(plan_tasks)))
        for t in daily_selection:
            t_copy = t.copy()
            t_copy["day"] = day
            t_copy["repetitions"] = 3
            final_plan_data.append(t_copy)

    # Calculate progression path based on frustration / emotional_score if need be
    emotion_reasoning = ""
    if baseline and getattr(baseline, "emotional_tone", 0) < 50:
        emotion_reasoning = " (Frustration detected during baseline, downgrading complexity slightly but keeping level scope)."
        
    reasoning = f"Generated {len(final_plan_data)} exercises over 7 days at '{target_level}' difficulty based on {accuracy:.1f}% baseline accuracy.{emotion_reasoning} " + " ".join(set(reasoning_parts))
    return final_plan_data, reasoning
