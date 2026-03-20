TASKS = [
# ── SOUND LEVEL (Articulation) ────────────────────────────────────────────────
{
  "name": "Listen & Repeat Sounds",
  "type": "articulation",
  "desc": "Child listens to isolated phonemes and repeats them accurately.",
  "levels": {
    "easy":     (1, [
        ("Listen and repeat this sound: /p/",       "/p/",      "Child produces a clear bilabial pop"),
        ("Listen and repeat this sound: /m/",       "/m/",      "Child hums nasally with lips closed"),
    ]),
    "medium":   (2, [
        ("Listen and repeat this sound: /s/",       "/s/",      "Steady sibilant, no lisp"),
        ("Listen and repeat this sound: /r/",       "/r/",      "Retroflexed tongue, rounded sound"),
    ]),
    "advanced": (3, [
        ("Listen and repeat this sound: /th/ (as in 'this')", "/ð/", "Voiced dental fricative"),
        ("Listen and repeat this sound: /zh/ (as in 'treasure')", "/ʒ/", "Voiced palato-alveolar fricative"),
    ]),
  }
},
{
  "name": "Match the Sound",
  "type": "articulation",
  "desc": "Child chooses the picture that starts with the heard sound and says the word.",
  "levels": {
    "easy":     (1, [
        ("Which picture starts with /b/? Say the word: ball / cat / sun",   "ball",   "Child says 'ball' clearly"),
        ("Which picture starts with /d/? Say the word: dog / egg / kite",   "dog",    "Child says 'dog' clearly"),
    ]),
    "medium":   (2, [
        ("Which picture starts with /fl/? Say the word: flag / crab / drum", "flag",  "Clear /fl/ blend"),
        ("Which picture starts with /sn/? Say the word: snake / plate / tree","snake", "Clear /sn/ blend"),
    ]),
    "advanced": (3, [
        ("Which picture starts with /str/? Say the word: street / blend / crisp","street","Clear /str/ cluster"),
        ("Which picture starts with /spr/? Say the word: spring / frame / clap","spring","Clear /spr/ cluster"),
    ]),
  }
},
{
  "name": "Animal Sound Imitation",
  "type": "articulation",
  "desc": "Child imitates animal sounds to practise specific phonemes.",
  "levels": {
    "easy":     (1, [
        ("What does the cat say? Repeat: meow",         "meow",       "Soft /m/ onset and diphthong"),
        ("What does the cow say? Repeat: moo",          "moo",        "Sustained /m/ + long vowel"),
    ]),
    "medium":   (2, [
        ("What does the snake say? Repeat: ssssss",     "ssssss",     "Prolonged /s/ without stopping"),
        ("What does the bee say? Repeat: zzzzzz",       "zzzzzz",     "Voiced /z/ buzz"),
    ]),
    "advanced": (3, [
        ("What does the crow say? Repeat: craaaaw",     "craaaaw",    "Clear /kr/ onset + vowel prolongation"),
        ("What does the frog say? Repeat: ribbit ribbit","ribbit ribbit","Clear /r/ onset, final /t/"),
    ]),
  }
},
{
  "name": "Syllable Pattern Repetition",
  "type": "articulation",
  "desc": "Child repeats rhythmic syllable chains to practise transitions.",
  "levels": {
    "easy":     (1, [
        ("Repeat: pa-pa-pa",      "pa-pa-pa",         "Equal stress, clear /p/ release"),
        ("Repeat: ma-ma-ma",      "ma-ma-ma",         "Nasal onset each syllable"),
    ]),
    "medium":   (2, [
        ("Repeat: pa-ta-pa-ta",   "pa-ta-pa-ta",      "Clean bilabial–alveolar alternation"),
        ("Repeat: ka-ta-ka-ta",   "ka-ta-ka-ta",      "Clean velar–alveolar alternation"),
    ]),
    "advanced": (3, [
        ("Repeat: pa-ta-ka-pa-ta-ka", "pa-ta-ka-pa-ta-ka", "Smooth tri-syllable diadochokinesis"),
        ("Repeat: ba-da-ga-ba-da-ga", "ba-da-ga-ba-da-ga", "Voiced tri-syllable diadochokinesis"),
    ]),
  }
},
{
  "name": "Mouth-Shape Mimic",
  "type": "articulation",
  "desc": "Child watches mouth animation and copies the shape to produce the sound.",
  "levels": {
    "easy":     (1, [
        ("Watch the mouth make /o/. Copy the round shape and say: oh", "oh", "Rounded lips, open jaw"),
        ("Watch the mouth make /ee/. Copy the wide smile and say: ee", "ee", "Spread lips, raised tongue"),
    ]),
    "medium":   (2, [
        ("Watch the mouth make /sh/. Copy the shape and say: shhhh", "shhhh", "Rounded protruded lips, hushing sound"),
        ("Watch the mouth make /f/.  Copy the shape and say: ffff",  "ffff",  "Upper teeth on lower lip"),
    ]),
    "advanced": (3, [
        ("Watch the mouth make /th/. Stick tongue between teeth and say: thin","thin","Interdental fricative, unvoiced"),
        ("Watch the mouth make /r/. Curl tongue back and say: run",  "run",   "Retroflexed /r/ onset"),
    ]),
  }
},
{
  "name": "Target Phoneme Words (R-words)",
  "type": "articulation",
  "desc": "Focused production of the /r/ phoneme in varied word positions.",
  "levels": {
    "easy":     (1, [
        ("Look at the picture and say: rabbit",  "rabbit",  "/r/ in word-initial position"),
        ("Look at the picture and say: red",     "red",     "/r/ onset before vowel"),
    ]),
    "medium":   (2, [
        ("Say the word: train",   "train",   "/r/ in consonant cluster"),
        ("Say the word: orange",  "orange",  "/r/ in medial position"),
    ]),
    "advanced": (3, [
        ("Say the full phrase: The red rabbit runs on the road.",
         "The red rabbit runs on the road.",
         "Multiple /r/ tokens, natural prosody"),
        ("Say the sentence: Rory the raccoon races around the river.",
         "Rory the raccoon races around the river.",
         "High-density /r/ sentence, connected speech"),
    ]),
  }
},

# ── WORD LEVEL ─────────────────────────────────────────────────────────────────
{
  "name": "Picture Naming",
  "type": "articulation",
  "desc": "Child names pictured objects clearly.",
  "levels": {
    "easy":     (1, [
        ("What is this? (picture: dog)",  "dog",  "Clear final /g/"),
        ("What is this? (picture: sun)",  "sun",  "Clear /s/ onset and final /n/"),
    ]),
    "medium":   (2, [
        ("What is this? (picture: umbrella)", "umbrella", "Three syllables, stress on second"),
        ("What is this? (picture: elephant)", "elephant", "Three syllables, initial /el/"),
    ]),
    "advanced": (3, [
        ("What is this? (picture: butterfly)", "butterfly", "Three syllables, /fl/ blend"),
        ("What is this? (picture: strawberry)", "strawberry", "/str/ cluster onset"),
    ]),
  }
},
{
  "name": "Minimal Pairs Game",
  "type": "articulation",
  "desc": "Child distinguishes and produces near-identical word pairs.",
  "levels": {
    "easy":     (1, [
        ("Say both words clearly: cat / bat",   "cat / bat",   "Contrast /k/ vs /b/ onset"),
        ("Say both words clearly: pan / fan",   "pan / fan",   "Contrast /p/ vs /f/ onset"),
    ]),
    "medium":   (2, [
        ("Say both words clearly: rice / lice",  "rice / lice",  "Contrast /r/ vs /l/ onset"),
        ("Say both words clearly: seat / sheet", "seat / sheet", "Contrast /s/ vs /ʃ/ onset"),
    ]),
    "advanced": (3, [
        ("Say both words clearly: right / light", "right / light", "Contrast /r/ vs /l/ onset"),
        ("Say both words clearly: three / free",  "three / free",  "Contrast /θ/ vs /f/ onset"),
    ]),
  }
},
{
  "name": "Color Word Practice",
  "type": "articulation",
  "desc": "Child names colors displayed on screen clearly and fluently.",
  "levels": {
    "easy":     (1, [
        ("Say the color you see: RED",    "red",    "Clear /r/ onset"),
        ("Say the color you see: BLUE",   "blue",   "Clear /bl/ blend"),
    ]),
    "medium":   (2, [
        ("Say the color you see: ORANGE",  "orange",  "Two syllables, medial /r/"),
        ("Say the color you see: PURPLE",  "purple",  "/r/ in medial cluster"),
    ]),
    "advanced": (3, [
        ("Say the full phrase: bright orange and dark purple", "bright orange and dark purple", "Multiple targets in phrase"),
        ("Say the full phrase: scarlet red and emerald green", "scarlet red and emerald green", "/sk/ and /gr/ clusters"),
    ]),
  }
},
{
  "name": "Emotion Words",
  "type": "articulation",
  "desc": "Child names emotions and uses matching vocal tone.",
  "levels": {
    "easy":     (1, [
        ("Say this emotion word HAPPILY: happy",   "happy",   "Rising intonation, clear /h/"),
        ("Say this emotion word SADLY: sad",       "sad",     "Falling intonation, clear /s/"),
    ]),
    "medium":   (2, [
        ("Say these emotion words: excited / bored",   "excited / bored",   "Contrast tones"),
        ("Say these emotion words: nervous / relaxed", "nervous / relaxed", "Contrast tones"),
    ]),
    "advanced": (3, [
        ("Say the sentence with matching emotion: I am so excited about my birthday!",
         "I am so excited about my birthday!",
         "Excited prosody, clear articulation"),
        ("Say the sentence with matching emotion: I feel really tired today.",
         "I feel really tired today.",
         "Subdued prosody, clear articulation"),
    ]),
  }
},

# ── SENTENCE LEVEL ─────────────────────────────────────────────────────────────
{
  "name": "Short Phrase Repetition",
  "type": "fluency",
  "desc": "Child repeats short phrases with correct rhythm and articulation.",
  "levels": {
    "easy":     (1, [
        ("Repeat: Big blue ball.",       "Big blue ball.",       "3 words, clear stops"),
        ("Repeat: Soft wet mud.",        "Soft wet mud.",        "3 words, CVC pattern"),
    ]),
    "medium":   (2, [
        ("Repeat: Red rabbit runs fast.", "Red rabbit runs fast.", "4 words, /r/ targets"),
        ("Repeat: She sells sea shells.", "She sells sea shells.", "4 words, /s/ and /ʃ/"),
    ]),
    "advanced": (3, [
        ("Repeat: The striped tiger stretched and roared.", "The striped tiger stretched and roared.", "7 words, clusters"),
        ("Repeat: Six slippery snails slid slowly seaward.",  "Six slippery snails slid slowly seaward.", "/sl/ /sn/ clusters"),
    ]),
  }
},
{
  "name": "Fill-in-the-Blank",
  "type": "fluency",
  "desc": "AI says the sentence stem; child completes it with the missing word.",
  "levels": {
    "easy":     (1, [
        ("The sky is ___. (color)", "blue", "Single word, correct color"),
        ("A dog says ___.",         "woof", "Single word, animal sound"),
    ]),
    "medium":   (2, [
        ("I eat breakfast in the ___ (time of day).", "morning", "Single word, temporal concept"),
        ("Birds can ___ in the sky.",                 "fly",     "Single verb, correct tense"),
    ]),
    "advanced": (3, [
        ("After it rains, you might see a ___ in the sky.", "rainbow", "Multi-syllable word, inference"),
        ("The opposite of night-time is ___.",             "daytime", "Compound word, antonym"),
    ]),
  }
},
{
  "name": "Rhyming Practice",
  "type": "fluency",
  "desc": "Child produces rhyming word pairs or completes rhyming couplets.",
  "levels": {
    "easy":     (1, [
        ("Say two words that rhyme: cat and ___.", "hat / bat / mat / rat", "Any correct rhyme accepted"),
        ("Say two words that rhyme: sun and ___.", "run / fun / bun",       "Any correct rhyme accepted"),
    ]),
    "medium":   (2, [
        ("Complete the rhyme: I have a dog, he sat on a ___.",  "log",  "Rhyme within context"),
        ("Complete the rhyme: The frog went hop, he just won't ___.", "stop", "Rhyme within context"),
    ]),
    "advanced": (3, [
        ("Make up a 2-line rhyme using: cake / lake.",
         "e.g. I ate a cake beside a lake.",
         "Child-generated rhyming couplet"),
        ("Make up a 2-line rhyme using: night / bright.",
         "e.g. The stars shine bright all through the night.",
         "Child-generated rhyming couplet"),
    ]),
  }
},
{
  "name": "Describe Picture Action",
  "type": "fluency",
  "desc": "Child describes what is happening in a scene picture.",
  "levels": {
    "easy":     (1, [
        ("What is the boy doing? (picture: boy running)", "The boy is running.", "Subject + verb"),
        ("What is the girl doing? (picture: girl drawing)", "The girl is drawing.", "Subject + verb"),
    ]),
    "medium":   (2, [
        ("Describe the whole picture: children playing in the park.",
         "The children are playing in the park.",
         "Subject + verb + prepositional phrase"),
        ("Describe the scene: a dog chasing a ball on the beach.",
         "The dog is chasing a ball on the beach.",
         "Subject + verb + object + location"),
    ]),
    "advanced": (3, [
        ("Tell me everything you see: a busy market with people, fruits, and noise.",
         "Multi-clause description of market scene.",
         "3+ clauses, adjectives, varied vocabulary"),
        ("Describe what might happen next: a cat climbing a tall tree.",
         "Prediction + description, future tense.",
         "Inference + future tense construction"),
    ]),
  }
},
{
  "name": "Counting with Phrases (Prosody)",
  "type": "fluency",
  "desc": "Child counts objects using phrases to build prosodic rhythm.",
  "levels": {
    "easy":     (1, [
        ("Count the apples slowly: one apple, two apples.",     "one apple, two apples",             "Even stress, clear plural /z/"),
        ("Count the stars slowly: one star, two stars.",        "one star, two stars",               "Even stress, /st/ cluster"),
    ]),
    "medium":   (2, [
        ("Count to five with the object: one balloon … five balloons.",
         "one balloon, two balloons, three balloons, four balloons, five balloons",
         "Increasing phrase length, natural rhythm"),
        ("Count backwards from five: five fish … one fish.",
         "five fish, four fish, three fish, two fish, one fish",
         "Descending sequence, prosodic control"),
    ]),
    "advanced": (3, [
        ("Count by twos and add a color: two red apples, four red apples, six red apples.",
         "two red apples, four red apples, six red apples",
         "Skip counting + adjective, sustained phrase production"),
        ("Say: I have one cookie, she has two cookies, we have three cookies together.",
         "I have one cookie, she has two cookies, we have three cookies together.",
         "Subject changes, connected sentence prosody"),
    ]),
  }
},

# ── STORY / MEMORY ─────────────────────────────────────────────────────────────
{
  "name": "Repeat Story Lines",
  "type": "cognition",
  "desc": "Child listens to story lines and repeats them accurately.",
  "levels": {
    "easy":     (1, [
        ("Repeat: Once upon a time, a bunny hopped.",
         "Once upon a time, a bunny hopped.",
         "7 words, past tense"),
        ("Repeat: A little bird sang a sweet song.",
         "A little bird sang a sweet song.",
         "8 words, past tense"),
    ]),
    "medium":   (2, [
        ("Repeat: Once upon a time, a rabbit ran fast through the big green forest.",
         "Once upon a time, a rabbit ran fast through the big green forest.",
         "14 words, adjectives, prepositional phrase"),
        ("Repeat: The brave little mouse found a golden key under the old oak tree.",
         "The brave little mouse found a golden key under the old oak tree.",
         "14 words, descriptive language"),
    ]),
    "advanced": (3, [
        ("Repeat: Every morning the sleepy dragon yawned three times before blowing a tiny puff of smoke.",
         "Every morning the sleepy dragon yawned three times before blowing a tiny puff of smoke.",
         "16 words, adverbial + complex predicate"),
        ("Repeat: Although the rain was pouring, the cheerful children continued to splash in every puddle they found.",
         "Although the rain was pouring, the cheerful children continued to splash in every puddle they found.",
         "17 words, subordinate clause"),
    ]),
  }
},
{
  "name": "Recall a Picture Sequence",
  "type": "cognition",
  "desc": "Child views a 3-panel comic and describes each step in order.",
  "levels": {
    "easy":     (1, [
        ("Look at the 3 pictures. What happens first? (dog sees ball)",
         "The dog sees the ball.",
         "Step 1 identification, simple sentence"),
        ("What happens next? (dog runs to ball)",
         "The dog runs to the ball.",
         "Step 2, motion verb"),
    ]),
    "medium":   (2, [
        ("Tell me what happens in all 3 pictures using 'first, then, last'. (girl bakes a cake)",
         "First the girl mixes the batter. Then she bakes it. Last she eats the cake.",
         "Sequencing connectors, 3 sentences"),
        ("Tell me what happens in all 3 pictures: (boy loses kite, climbs tree, gets kite back)",
         "First the boy loses his kite. Then he climbs the tree. Last he gets it back.",
         "Narrative sequencing"),
    ]),
    "advanced": (3, [
        ("Describe all 5 panels: family picnic gets rained on, they pack up, go home, make hot chocolate, laugh together.",
         "Full 5-step narrative with causal links.",
         "Causal connectors: because, so, then"),
        ("Tell the full story and explain why things happened: kitten knocks over paint, makes a mess, owner finds colorful prints, hangs them as art.",
         "4-event narrative + causal reasoning.",
         "Inference + cause-effect language"),
    ]),
  }
},
{
  "name": "Retell Story Using Images",
  "type": "cognition",
  "desc": "Child listens to a short story, then retells it in own words using picture prompts.",
  "levels": {
    "easy":     (1, [
        ("Listen: A cat sat on a mat. It ate a fish. Retell using the picture.",
         "The cat sat on the mat and ate a fish.",
         "Main idea retention, simple retell"),
        ("Listen: A boy flew a kite. The wind was strong. Retell using the picture.",
         "The boy flew a kite in the strong wind.",
         "2-event retell"),
    ]),
    "medium":   (2, [
        ("Listen: Tina found a tiny frog in the garden. She put it in a jar and showed her mum. Retell.",
         "Tina found a frog and put it in a jar to show her mum.",
         "3-event retell, character name retained"),
        ("Listen: The wind blew Leo's hat away. He chased it down the road and caught it. Retell.",
         "Leo's hat blew away and he ran to catch it.",
         "Cause-effect retell"),
    ]),
    "advanced": (3, [
        ("Listen to the 6-sentence story about a lost puppy. Retell it in your own words.",
         "Child's retell includes: puppy lost, searches, helper, reunion, emotion.",
         "Key story elements retained, own vocabulary"),
        ("Listen to the story of Maya and the magic paintbrush. Retell and say what you think the lesson is.",
         "Retell + moral inference.",
         "Narrative + inferential reasoning"),
    ]),
  }
},
{
  "name": "Listen & Answer Comprehension",
  "type": "cognition",
  "desc": "Child listens to a short passage and answers questions in full sentences.",
  "levels": {
    "easy":     (1, [
        ("Listen: Sam has a red ball. Who has the red ball?", "Sam has the red ball.", "Literal recall, full sentence"),
        ("Listen: The cat is under the chair. Where is the cat?", "The cat is under the chair.", "Location recall"),
    ]),
    "medium":   (2, [
        ("Listen: Mia's dog barked all night because it was scared of thunder. Why did the dog bark?",
         "The dog barked because it was scared of thunder.",
         "Causal comprehension"),
        ("Listen: Ben always eats breakfast before school, but today he was late and skipped it. What did Ben skip today?",
         "Ben skipped breakfast today.",
         "Inference from contrast"),
    ]),
    "advanced": (3, [
        ("Listen to the short passage about penguins. What do penguins eat, and where do they live?",
         "Penguins eat fish and live in cold, icy places like Antarctica.",
         "Two-part factual recall, content vocabulary"),
        ("Listen to the story. How do you think the main character felt at the end, and why?",
         "Emotional inference with reason.",
         "Affective inference, justification"),
    ]),
  }
},
{
  "name": "Follow-the-Direction Game",
  "type": "cognition",
  "desc": "Child follows multi-step directions, then says what they did.",
  "levels": {
    "easy":     (1, [
        ("Touch the red ball and say the color.",  "Red.",        "1-step direction + verbal output"),
        ("Clap two times and say 'done'.",         "Clap clap. Done.", "1-step action + verbal signal"),
    ]),
    "medium":   (2, [
        ("Touch the blue star, then touch the yellow circle, and say both colors.",
         "Blue and yellow.",
         "2-step direction, color naming"),
        ("Stand up, turn around once, sit down, then say what you did.",
         "I stood up, turned around, and sat down.",
         "2-step motor + verbal report"),
    ]),
    "advanced": (3, [
        ("Touch the big red square, then the small blue triangle, count both shapes, and tell me what you touched.",
         "I touched the big red square and the small blue triangle. That's two shapes.",
         "3-step + count + verbal report"),
        ("Pick the card with a fruit, put it in the box, slide the box left, then describe the card.",
         "It was a [fruit] card. I put it in the box and slid it left.",
         "Multi-step sequencing + description"),
    ]),
  }
},

# ── INTERACTIVE / GAMIFIED ──────────────────────────────────────────────────────
{
  "name": "Word Unlocker",
  "type": "articulation",
  "desc": "Correct pronunciation of a target word unlocks an on-screen door/box.",
  "levels": {
    "easy":     (1, [
        ("Say the magic word to open the box: 'key'",   "key",   "Clear /k/ onset, final vowel"),
        ("Say the magic word to open the door: 'open'", "open",  "Clear /o/ onset, two syllables"),
    ]),
    "medium":   (2, [
        ("Say the magic word to unlock the chest: 'treasure'", "treasure", "/tr/ cluster, schwa ending"),
        ("Say the magic word to open the gate: 'enter'",       "enter",    "Clear /e/ onset, final /r/"),
    ]),
    "advanced": (3, [
        ("Say the magic phrase to open the vault: 'secret password'", "secret password", "Two clear words, /s/ and /p/ targets"),
        ("Say the magic spell to unlock the tower: 'abracadabra'",    "abracadabra",     "5 syllables, stress on 3rd"),
    ]),
  }
},
{
  "name": "Sound Chase Game",
  "type": "articulation",
  "desc": "Child says a target word/sound to make the avatar move on screen.",
  "levels": {
    "easy":     (1, [
        ("Say 'go!' to make the rabbit run.", "go",    "Clear /g/ onset"),
        ("Say 'jump!' to make the frog jump.", "jump", "Final /p/ stop"),
    ]),
    "medium":   (2, [
        ("Say 'faster!' to speed up the car.", "faster", "/f/ onset, /st/ cluster"),
        ("Say 'zigzag!' to make the fish zigzag.", "zigzag", "Repeated /z/, two syllables"),
    ]),
    "advanced": (3, [
        ("Say the full command: 'Run to the finish line!' to win the race.",
         "Run to the finish line!",
         "5 words, imperative intonation"),
        ("Say: 'Quickly sprint past the trees!' to win extra stars.",
         "Quickly sprint past the trees!",
         "/kw/ and /spr/ clusters, 5 words"),
    ]),
  }
},
{
  "name": "Build-a-World",
  "type": "cognition",
  "desc": "Each correct response adds an element to a growing scene.",
  "levels": {
    "easy":     (1, [
        ("Name this object to add it to your world: (picture: tree)", "tree", "Adds tree to scene"),
        ("Name this object to add it to your world: (picture: cloud)", "cloud", "Adds cloud to scene"),
    ]),
    "medium":   (2, [
        ("Describe this object to add it: (picture: waterfall) — say its color and sound.",
         "The waterfall is white and blue and sounds like rushing water.",
         "Attribute description"),
        ("Describe this object: (picture: volcano) — what it looks like and what it does.",
         "The volcano is tall and red and it shoots out lava.",
         "Function + appearance"),
    ]),
    "advanced": (3, [
        ("Add 3 items to your world by naming each and saying one fact about it: mountains, river, bridge.",
         "Mountains are tall. A river flows with water. A bridge goes over the river.",
         "3 items + 1 fact each"),
        ("Build a complete scene: say 4 sentences describing a jungle world you're creating.",
         "4-sentence scene description with animals, plants, weather, and action.",
         "Extended scene narration"),
    ]),
  }
},
{
  "name": "Speech Puzzle",
  "type": "articulation",
  "desc": "Saying each word correctly fills a piece into an on-screen puzzle.",
  "levels": {
    "easy":     (1, [
        ("Say the word to fill piece 1: 'star'",    "star",    "/st/ onset, final /r/"),
        ("Say the word to fill piece 2: 'moon'",    "moon",    "/m/ onset, long vowel"),
    ]),
    "medium":   (2, [
        ("Say the word to fill piece 3: 'planet'",  "planet",  "/pl/ cluster, 2 syllables"),
        ("Say the word to fill piece 4: 'rocket'",  "rocket",  "/r/ onset, final /t/"),
    ]),
    "advanced": (3, [
        ("Say the phrase to fill the last piece: 'The rocket zooms to the stars!'",
         "The rocket zooms to the stars!",
         "6 words, /r/ and /z/ targets, exclamatory intonation"),
        ("Say the full sentence to complete the puzzle: 'Astronauts float in outer space.'",
         "Astronauts float in outer space.",
         "5 words, multi-syllable target word"),
    ]),
  }
},
{
  "name": "Magic Object",
  "type": "articulation",
  "desc": "Saying the object name correctly makes it appear on screen by magic.",
  "levels": {
    "easy":     (1, [
        ("Say the magic word to make it appear: 'bag'",  "bag",  "CVC, clear /b/ onset and /g/ final"),
        ("Say the magic word to make it appear: 'hat'",  "hat",  "CVC, clear /h/ onset"),
    ]),
    "medium":   (2, [
        ("Say the magic word: 'dragon'",  "dragon",  "/dr/ cluster, 2 syllables"),
        ("Say the magic word: 'crystal'", "crystal", "/kr/ cluster, 2 syllables"),
    ]),
    "advanced": (3, [
        ("Say the magic phrase: 'a sparkling golden crown'",
         "a sparkling golden crown",
         "/sp/ cluster, 4-word phrase"),
        ("Say the magic spell: 'shimmering silver shield appears!'",
         "shimmering silver shield appears!",
         "/ʃ/ alliteration, 4 words, exclamation"),
    ]),
  }
},
{
  "name": "Sound and Reward Task",
  "type": "articulation",
  "desc": "Correct target sound production earns stars or balloons on screen.",
  "levels": {
    "easy":     (1, [
        ("Say /s/ clearly to earn a star!",   "/s/",  "Sustained /s/ for 2 seconds"),
        ("Say /m/ clearly to earn a balloon!", "/m/", "Nasal hum, 2 seconds"),
    ]),
    "medium":   (2, [
        ("Say the word 'snake' perfectly to earn 2 stars!",  "snake",  "/sn/ cluster, final /k/"),
        ("Say the word 'stream' perfectly to earn 2 stars!", "stream", "/str/ cluster, 1 syllable"),
    ]),
    "advanced": (3, [
        ("Say the tongue twister to earn 5 stars: 'Silly Sally swiftly shooed seven silly sheep'",
         "Silly Sally swiftly shooed seven silly sheep",
         "/s/ and /ʃ/ alliteration, 8 words"),
        ("Say the sentence to earn 5 stars: 'She sells seashells by the seashore.'",
         "She sells seashells by the seashore.",
         "Classic /s/ and /ʃ/ tongue twister"),
    ]),
  }
},
{
  "name": "Emotion Imitation",
  "type": "fluency",
  "desc": "Child repeats a sentence using the prompted emotion; prosody is evaluated.",
  "levels": {
    "easy":     (1, [
        ("Say this HAPPILY: 'I love ice cream!'",    "I love ice cream!",    "Rising bright prosody, exclamation"),
        ("Say this SADLY: 'I lost my balloon.'",     "I lost my balloon.",   "Falling flat prosody"),
    ]),
    "medium":   (2, [
        ("Say this in a SCARED voice: 'Something is behind the door!'",
         "Something is behind the door!",
         "Tense, higher pitch, faster rate"),
        ("Say this in a SURPRISED voice: 'I can't believe you're here!'",
         "I can't believe you're here!",
         "High pitch onset, lengthened vowels"),
    ]),
    "advanced": (3, [
        ("Say this ANGRILY then CALMLY — notice the difference: 'I told you not to do that.'",
         "I told you not to do that. [angry] … I told you not to do that. [calm]",
         "Contrast in pitch, rate, and loudness"),
        ("Say this with GROWING excitement (3 times, louder and faster each time): 'We won! We won! We won!'",
         "We won! We won! We won!",
         "Prosodic escalation across repetitions"),
    ]),
  }
},
{
  "name": "Guess-the-Word Game",
  "type": "cognition",
  "desc": "Child listens to clues, identifies the word, and then pronounces it.",
  "levels": {
    "easy":     (1, [
        ("It's an animal. It barks. It's your best friend. What is it? Now say it!",
         "dog",
         "Single-word identification + production"),
        ("It's round. You bounce it. It's a ___. Now say it!",
         "ball",
         "Single-word identification + production"),
    ]),
    "medium":   (2, [
        ("It's a fruit. It's yellow. Monkeys love it. What is it? Now say the full sentence: 'It is a banana.'",
         "It is a banana.",
         "Word ID + full-sentence production"),
        ("It's cold, white, and falls from the sky in winter. What is it? Say: 'It is called snow.'",
         "It is called snow.",
         "Inference + full sentence"),
    ]),
    "advanced": (3, [
        ("I'm thinking of something you find in space. It's not a planet, it gives us light, it's very far away. What is it? Now describe it in 2 sentences.",
         "It is a star. Stars are giant balls of burning gas far away in space.",
         "Inference + 2-sentence description"),
        ("I have wings but I'm not a bird. I fly at night and sleep upside-down. Say my name and one fact about me.",
         "It is a bat. Bats use echolocation to fly in the dark.",
         "Inference + name + fact"),
    ]),
  }
},
{
  "name": "Memory Speaking",
  "type": "cognition",
  "desc": "Child listens to a list of words or numbers, then repeats them in order.",
  "levels": {
    "easy":     (1, [
        ("Listen and repeat in order: cat, bus, sun.",      "cat, bus, sun",           "3 items, forward recall"),
        ("Listen and repeat in order: one, two, three.",   "one, two, three",         "3 digit forward span"),
    ]),
    "medium":   (2, [
        ("Listen and repeat in order: apple, pencil, rocket, star.", "apple, pencil, rocket, star", "4 items forward"),
        ("Listen and repeat: seven, two, nine, four.",              "seven, two, nine, four",       "4-digit span"),
    ]),
    "advanced": (3, [
        ("Listen and repeat: elephant, calendar, umbrella, bicycle, pineapple.",
         "elephant, calendar, umbrella, bicycle, pineapple",
         "5 multi-syllable words"),
        ("Listen and repeat: three, eight, one, six, two, nine.",
         "three, eight, one, six, two, nine",
         "6-digit forward span"),
    ]),
  }
},
{
  "name": "Daily Talking Diary",
  "type": "fluency",
  "desc": "Child records a short spoken account of their day to track fluency over time.",
  "levels": {
    "easy":     (1, [
        ("Tell me one thing you did today. Use one sentence.",
         "Today I [action].",
         "1 sentence, past tense"),
        ("Tell me what you ate today. Use one sentence.",
         "Today I ate [food].",
         "1 sentence, food vocabulary"),
    ]),
    "medium":   (2, [
        ("Tell me about your morning. Use 2 or 3 sentences.",
         "I woke up. I ate breakfast. Then I went to school.",
         "3 sentences, sequential connectors"),
        ("Tell me the best part of your day and why. Use 2–3 sentences.",
         "The best part was [event] because [reason].",
         "Opinion + reason structure"),
    ]),
    "advanced": (3, [
        ("Tell me everything about your day from morning to night. Use at least 5 sentences.",
         "Multi-sentence narrative covering morning, school, afternoon, evening.",
         "Extended narrative, temporal connectors"),
        ("Tell me about something that surprised you today and how it made you feel. Use 4–5 sentences.",
         "Today [event] happened. I felt [emotion] because [reason]. Then I [reaction].",
         "Event + emotional reflection + reaction"),
    ]),
  }
},
]

ADAPTIVE_LOGIC_CHILD = {
    "age_group": "child",
    "accuracy_threshold_low": 60,
    "accuracy_threshold_high": 70,
    "max_retries": 3,
    "frustration_action": "Immediately reduce difficulty level",
    "pass_action": "Advance to next level or next prompt",
    "fail_action": "Allow retry; after 3 fails move to lower level"
}
