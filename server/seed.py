import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from database import Base
from config import settings
from models.models import (
    User, Therapist, Patient, TherapyTask, BaselineTask,
    BaselineResult, TherapyPlan, DailyTask, TaskLog, AudioRecord, TherapyNote,
    AdaptiveLogic
)
from child_tasks_data import TASKS, ADAPTIVE_LOGIC_CHILD

async def init_db():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    print("Dropping existing tables...")
    async with engine.begin() as conn:
        from sqlalchemy import text
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
    
    print("Creating all 11 tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("Seeding baseline tasks from JSON files...")
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    import json
    import os
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

    async with AsyncSessionLocal() as session:
        # --- Baseline Tasks from JSON ---
        baseline_tasks = []
        for age_group, filename in [("child", "child_baseline.json"), ("adult", "adult_baseline.json")]:
            filepath = os.path.join(DATA_DIR, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            for entry in data:
                bt = BaselineTask(
                    baseline_id=entry["baseline_id"],
                    defect_id=entry["defect_id"],
                    age_group=age_group,
                    assessment_name=entry["assessment_name"],
                    assessment_type=entry["assessment_type"],
                    tasks=entry["tasks"],
                    scoring_criteria=entry.get("scoring_criteria", {}),
                    defect_detail=entry.get("defect_detail", {}),
                    recommended_tasks=entry.get("recommended_tasks", [])
                )
                baseline_tasks.append(bt)
        session.add_all(baseline_tasks)

        # --- Therapy Tasks: Adult (30 tasks) ---
        adult_tasks = [
            # Articulation
            TherapyTask(name="S-Sound Drills", category="articulation", difficulty_level="easy", therapy_goal="Improve /s/ sound production", description="Practice words containing the /s/ sound in initial, medial, and final positions.", age_group="adult", stimuli=["sun", "sister", "bus", "glass", "assist", "horse"], instructions="Say each word clearly, focusing on the /s/ sound."),
            TherapyTask(name="R-Sound Practice", category="articulation", difficulty_level="medium", therapy_goal="Improve /r/ sound production", description="Practice words with /r/ in different positions.", age_group="adult", stimuli=["run", "mirror", "car", "repair", "around", "door"], instructions="Focus on tongue placement for the /r/ sound."),
            TherapyTask(name="L-Sound Drills", category="articulation", difficulty_level="easy", therapy_goal="Improve /l/ sound production", description="Practice words with /l/ sound.", age_group="adult", stimuli=["lamp", "follow", "ball", "yellow", "believe", "tall"], instructions="Place tongue tip behind upper teeth for /l/."),
            TherapyTask(name="TH-Sound Practice", category="articulation", difficulty_level="medium", therapy_goal="Improve /th/ sound production", description="Practice voiced and voiceless TH sounds.", age_group="adult", stimuli=["think", "the", "bath", "mother", "teeth", "weather"], instructions="Place tongue between teeth for TH sound."),
            TherapyTask(name="Consonant Clusters", category="articulation", difficulty_level="hard", therapy_goal="Master consonant blends", description="Practice words with consonant clusters.", age_group="adult", stimuli=["string", "splash", "shrink", "problem", "extreme", "glimpse"], instructions="Say each blend smoothly without adding extra vowels."),
            TherapyTask(name="Multi-Syllable Words", category="articulation", difficulty_level="hard", therapy_goal="Improve accuracy on long words", description="Practice multi-syllable words with clear articulation.", age_group="adult", stimuli=["communication", "rehabilitation", "representative", "unfortunately", "investigation"], instructions="Break down each word into syllables, then say it fluently."),
            # Fluency
            TherapyTask(name="Easy Onset", category="fluency", difficulty_level="easy", therapy_goal="Reduce stuttering with gentle voice onset", description="Start words with a soft, gentle voice.", age_group="adult", stimuli=["I am happy", "Everyone is here", "Animals are interesting", "Open the window"], instructions="Begin each phrase with a gentle, easy start."),
            TherapyTask(name="Pacing with Metronome", category="fluency", difficulty_level="medium", therapy_goal="Improve speech rate control", description="Speak in rhythm with a steady beat.", age_group="adult", stimuli=["Today is a beautiful day", "I would like to order coffee", "The meeting starts at three", "Please pass the salt"], instructions="Match one syllable per beat."),
            TherapyTask(name="Continuous Phonation", category="fluency", difficulty_level="medium", therapy_goal="Reduce blocks between words", description="Connect words smoothly without pausing.", age_group="adult", stimuli=["I need to go to the store", "We are going to the park", "Can you help me with this"], instructions="Let your voice flow continuously between words."),
            TherapyTask(name="Reading Aloud", category="fluency", difficulty_level="easy", therapy_goal="Build reading fluency", description="Practice reading passages smoothly.", age_group="adult", stimuli=["The morning sun cast golden light across the meadow. Birds sang in the tall oak trees."], instructions="Read at a comfortable pace, pause at commas and periods."),
            TherapyTask(name="Narrative Speech", category="fluency", difficulty_level="hard", therapy_goal="Improve fluency in spontaneous speech", description="Tell a story or describe an event at length.", age_group="adult", stimuli=["Describe your morning routine", "Tell about your favorite vacation", "Explain how to make your favorite meal"], instructions="Speak for 2-3 minutes using techniques practiced."),
            # Voice
            TherapyTask(name="Pitch Glides", category="voice", difficulty_level="easy", therapy_goal="Improve pitch range and control", description="Glide smoothly from low to high pitch.", age_group="adult", stimuli=["aaah (low to high)", "eeee (high to low)", "oooo (low to high to low)"], instructions="Sustain each vowel while smoothly changing pitch."),
            TherapyTask(name="Volume Control", category="voice", difficulty_level="medium", therapy_goal="Improve loudness control", description="Practice speaking at different volume levels.", age_group="adult", stimuli=["Hello, how are you? (whisper)", "Hello, how are you? (normal)", "Hello, how are you? (projected)"], instructions="Say the same phrase at three different volumes."),
            TherapyTask(name="Breath Support", category="voice", difficulty_level="medium", therapy_goal="Improve respiratory support for speech", description="Practice sustained phonation with good breath control.", age_group="adult", stimuli=["Count from 1 to 20 on one breath", "Sustain 'ahh' for 15 seconds", "Read a paragraph on one breath"], instructions="Take a deep diaphragmatic breath before speaking."),
            TherapyTask(name="Resonance Exercises", category="voice", difficulty_level="hard", therapy_goal="Improve vocal resonance", description="Place voice forward for clearer projection.", age_group="adult", stimuli=["mmm-aaah", "nnn-eeee", "hum a tune then speak"], instructions="Feel vibrations in your face and nose."),
            # Language
            TherapyTask(name="Word Finding", category="language", difficulty_level="easy", therapy_goal="Improve lexical retrieval", description="Name items from categories as quickly as possible.", age_group="adult", stimuli=["Animals", "Foods", "Professions", "Countries", "Colors"], instructions="Name as many items as you can in 60 seconds per category."),
            TherapyTask(name="Sentence Formulation", category="language", difficulty_level="medium", therapy_goal="Improve sentence construction", description="Create grammatically correct sentences from given words.", age_group="adult", stimuli=[["dog", "park", "running"], ["teacher", "book", "interesting"], ["rain", "umbrella", "forgot"]], instructions="Form a complete sentence using all three words."),
            TherapyTask(name="Story Retelling", category="language", difficulty_level="medium", therapy_goal="Improve narrative language skills", description="Listen to a short story then retell it in your own words.", age_group="adult", stimuli=["A farmer found a golden egg in his chicken coop. He sold it and became wealthy, but grew greedy and lost everything."], instructions="Retell the story including main events in order."),
            TherapyTask(name="Inferencing", category="language", difficulty_level="hard", therapy_goal="Improve reading comprehension and inference", description="Read a passage and answer inference questions.", age_group="adult", stimuli=["Maria grabbed her umbrella and raincoat before leaving. Question: What was the weather like?"], instructions="Read carefully and answer based on clues in the text."),
            TherapyTask(name="Complex Directions", category="language", difficulty_level="hard", therapy_goal="Improve auditory comprehension", description="Follow multi-step instructions accurately.", age_group="adult", stimuli=["Point to the largest shape, then tap the table twice, and name a fruit.", "Clap your hands, touch your nose, and say your name backwards."], instructions="Listen to all steps, then complete them in order."),
            # Pragmatic
            TherapyTask(name="Conversation Starters", category="pragmatic", difficulty_level="easy", therapy_goal="Improve social communication initiation", description="Practice starting conversations in different situations.", age_group="adult", stimuli=["At a job interview", "Meeting a neighbor", "At a coffee shop", "At a doctor's office"], instructions="Practice an appropriate opening for each scenario."),
            TherapyTask(name="Turn-Taking Practice", category="pragmatic", difficulty_level="medium", therapy_goal="Improve conversational turn-taking", description="Practice giving and receiving conversational turns.", age_group="adult", stimuli=["Discuss weekend plans", "Talk about a recent movie", "Share a recipe"], instructions="Speak for 2-3 sentences, then pause to let the other person respond."),
            TherapyTask(name="Tone and Intent", category="pragmatic", difficulty_level="medium", therapy_goal="Improve understanding of tone and sarcasm", description="Interpret sentences based on tone of voice.", age_group="adult", stimuli=["Oh great, another Monday. (sarcastic)", "That's just wonderful! (sincere)", "Sure, I'd love to help. (reluctant)"], instructions="Identify the speaker's true meaning from tone."),
            TherapyTask(name="Repair Strategies", category="pragmatic", difficulty_level="hard", therapy_goal="Improve communication repair", description="Practice fixing communication breakdowns.", age_group="adult", stimuli=["Situation: Someone didn't understand you", "Situation: You used the wrong word", "Situation: Your listener seems confused"], instructions="Practice rephrasing, clarifying, or asking for confirmation."),
            TherapyTask(name="Telephone Conversation", category="pragmatic", difficulty_level="medium", therapy_goal="Improve phone communication skills", description="Practice making phone calls for everyday situations.", age_group="adult", stimuli=["Call to make a restaurant reservation", "Call to schedule a doctor's appointment", "Call to inquire about a job posting"], instructions="Practice the full conversation from greeting to closing."),
            # Additional mixed
            TherapyTask(name="Tongue Twisters", category="articulation", task_type="read_aloud", expected_response_type="exact_match", difficulty_level="medium", therapy_goal="Improve articulatory agility", description="Repeat tongue twisters at increasing speed.", age_group="adult", stimuli=["Red lorry, yellow lorry", "Unique New York", "Toy boat, toy boat, toy boat"], instructions="Start slowly and gradually increase speed."),
            TherapyTask(name="Oral Motor Exercises", category="articulation", task_type="read_aloud", expected_response_type="exact_match", difficulty_level="easy", therapy_goal="Strengthen oral muscles", description="Perform targeted mouth exercises.", age_group="adult", stimuli=["Lip stretches", "Tongue push-ups", "Jaw circles", "Cheek puffs"], instructions="Hold each position for 5 seconds, repeat 10 times."),
            
            # New Dynamic Task Types
            TherapyTask(name="Minimal Pairs Challenge", category="articulation", task_type="minimal_pairs", expected_response_type="exact_match", difficulty_level="medium", therapy_goal="Discriminate fine phonetic differences", description="Practice saying word pairs that differ by only one sound.", age_group="adult", stimuli=["rock - lock", "bat - vat", "sip - ship", "thin - fin", "cheap - sheep"], instructions="Say both words clearly, emphasizing the difference in sound."),
            TherapyTask(name="Diaphragmatic Expansion", category="voice", task_type="breath_control", expected_response_type="duration", difficulty_level="hard", therapy_goal="Improve respiratory support and speech rhythm", description="Count slowly to maximize breath usage.", age_group="adult", stimuli=["Count from 1 to 10 slowly in one breath.", "Count from 1 to 15 slowly in one breath.", "Sustain the 'ahh' sound for 15 seconds."], instructions="Take a deep breath and complete the prompt on a single exhale."),
            TherapyTask(name="Everyday Roleplay", category="pragmatic", task_type="roleplay", expected_response_type="free_speech", difficulty_level="medium", therapy_goal="Improve functional and spontaneous communication", description="Navigate common social scenarios and interactions.", age_group="adult", stimuli=["Scenario: Call a restaurant to reserve a table for two tonight.", "Scenario: Politely tell a neighbor their music is too loud.", "Scenario: Explain a complex project issue to your manager."], instructions="Read the scenario, think about your response, and speak freely. Try to sound natural and clear."),
            TherapyTask(name="Emotional Prosody", category="voice", task_type="emotional_prosody", expected_response_type="free_speech", difficulty_level="hard", therapy_goal="Improve vocal emotional expression", description="Infuse target emotions into neutral sentences.", age_group="adult", stimuli=["Say 'I am going to the store' sounding very excited.", "Say 'The bus left early' sounding disappointed.", "Say 'Are you sure about that?' sounding skeptical."], instructions="Focus on your tone of voice to convey the requested emotion accurately."),
            TherapyTask(name="Short Memory Recall", category="language", task_type="memory_recall", expected_response_type="exact_match", difficulty_level="hard", therapy_goal="Strengthen auditory memory and working memory", description="Listen to a list of items and repeat them back.", age_group="adult", stimuli=["apple, tree, house, dog", "red, blue, green, yellow, orange", "nine, four, two, eight, five, one"], instructions="Listen carefully, prepare your memory, and say the items back in order.")
        ]
        session.add_all(adult_tasks)

        # --- Therapy Tasks: Child (30 tasks) ---
        child_tasks = []
        for t in TASKS:
            for lvl_name, (dscore, prompts) in t["levels"].items():
                difficulty = "hard" if lvl_name == "advanced" else lvl_name
                stimuli = [
                    {
                        "prompt_text": p[0],
                        "expected_response": p[1],
                        "example_output": p[2]
                    }
                    for p in prompts
                ]
                child_task = TherapyTask(
                    name=t["name"],
                    category=t["type"],
                    task_type="interactive",
                    expected_response_type="exact_match",
                    difficulty_level=difficulty,
                    therapy_goal=t["desc"],
                    description=t["desc"],
                    age_group="child",
                    stimuli=stimuli,
                    instructions=t["desc"]
                )
                child_tasks.append(child_task)
        session.add_all(child_tasks)

        # --- Adaptive Logic ---
        adaptive_logic = AdaptiveLogic(
            age_group=ADAPTIVE_LOGIC_CHILD["age_group"],
            accuracy_threshold_low=ADAPTIVE_LOGIC_CHILD["accuracy_threshold_low"],
            accuracy_threshold_high=ADAPTIVE_LOGIC_CHILD["accuracy_threshold_high"],
            max_retries=ADAPTIVE_LOGIC_CHILD["max_retries"],
            frustration_action=ADAPTIVE_LOGIC_CHILD["frustration_action"],
            pass_action=ADAPTIVE_LOGIC_CHILD["pass_action"],
            fail_action=ADAPTIVE_LOGIC_CHILD["fail_action"]
        )
        session.add(adaptive_logic)


        await session.commit()
        print(f"Seeded {len(baseline_tasks)} baseline tasks")
        print(f"Seeded {len(adult_tasks)} adult therapy tasks")
        print(f"Seeded {len(child_tasks)} child therapy tasks")

    await engine.dispose()
    print("Database initialized successfully!")

if __name__ == "__main__":
    print("Initializing Database...")
    asyncio.run(init_db())
