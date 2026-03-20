"""
Component 3 — spaCy NLP (Content Scoring).

Spec: ai_workflow.md §Component 3
Library: spacy + en_core_web_md
Runs on: free_speech and roleplay tasks ONLY.

Input: Whisper transcript text
Outputs:
  ContentScore — % of required_elements confirmed
  WHO element  — Named Entity Recognition
  TOPIC element — dependency parsing subject clause
  OUTCOME element — agreement language detection
"""

# Agreement/outcome keywords
OUTCOME_KEYWORDS = {
    "agreed", "decided", "resolved", "concluded", "settled",
    "determined", "planned", "committed", "promised", "arranged",
    "will", "going to", "should", "must", "need to",
}

# Task modes that should run NLP content scoring
NLP_TASK_MODES = {"free_speech", "roleplay", "debate"}


class NLPService:
    def __init__(self):
        self.nlp = None

    def load_model(self):
        if self.nlp is None:
            import spacy
            try:
                print("Loading spaCy en_core_web_md...")
                self.nlp = spacy.load("en_core_web_md")
            except OSError:
                print("en_core_web_md not found, trying en_core_web_sm...")
                try:
                    self.nlp = spacy.load("en_core_web_sm")
                except OSError:
                    print("No spaCy model found. ContentScore will return 0.")
                    self.nlp = None

    def score_content(
        self,
        transcript: str,
        required_elements: list = None,
        task_mode: str = "free_speech",
    ) -> dict:
        """
        Score free_speech/roleplay transcript for content completeness.

        Args:
            transcript: Whisper transcript text
            required_elements: List of element dicts from prompt JSON, e.g.
                [{"element": "WHO", "description": "mention a doctor"},
                 {"element": "TOPIC", "description": "discuss treatment plan"},
                 {"element": "OUTCOME", "description": "agree on next steps"}]
            task_mode: Only runs on free_speech/roleplay

        Returns:
            dict with content_score, element results, detected entities
        """
        # Task-mode filter
        if task_mode not in NLP_TASK_MODES:
            return {
                "content_score": 0,
                "elements": {},
                "skipped": True,
                "reason": f"NLP not applicable for task_mode={task_mode}",
            }

        if not transcript or not transcript.strip():
            return {
                "content_score": 0,
                "elements": {},
                "skipped": False,
                "reason": "Empty transcript",
            }

        self.load_model()
        if self.nlp is None:
            return {
                "content_score": 0,
                "elements": {},
                "skipped": True,
                "reason": "spaCy model not available",
            }

        doc = self.nlp(transcript)

        # ── Element Detection ────────────────────────────────────
        who_result = self._detect_who(doc)
        topic_result = self._detect_topic(doc)
        outcome_result = self._detect_outcome(doc, transcript)

        # ── Score against required_elements ───────────────────────
        detected_elements = {
            "WHO": who_result,
            "TOPIC": topic_result,
            "OUTCOME": outcome_result,
        }

        if required_elements and len(required_elements) > 0:
            matched = 0
            element_results = {}
            for req in required_elements:
                elem_type = req.get("element", "").upper()
                description = req.get("description", "")

                if elem_type in detected_elements:
                    det = detected_elements[elem_type]
                    present = det["found"]
                    # Also check if description keywords appear in transcript
                    if not present and description:
                        desc_words = set(description.lower().split())
                        trans_words = set(transcript.lower().split())
                        overlap = desc_words & trans_words
                        present = len(overlap) >= max(1, len(desc_words) // 3)

                    element_results[elem_type] = {
                        "required": description,
                        "found": present,
                        "details": det,
                    }
                    if present:
                        matched += 1
                else:
                    # Generic keyword check
                    present = description.lower() in transcript.lower() if description else False
                    element_results[elem_type] = {
                        "required": description,
                        "found": present,
                        "details": {},
                    }
                    if present:
                        matched += 1

            content_score = int((matched / max(1, len(required_elements))) * 100)
        else:
            # No required_elements — score based on richness
            element_results = detected_elements
            found_count = sum(1 for v in detected_elements.values() if v.get("found"))
            content_score = int((found_count / 3) * 100)

        return {
            "content_score": min(100, content_score),
            "elements": element_results,
            "skipped": False,
            "reason": "",
        }

    # ── Private Detectors ────────────────────────────────────────

    def _detect_who(self, doc) -> dict:
        """Use NER to find person/role mentions."""
        persons = []
        roles = []
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                persons.append(ent.text)
            elif ent.label_ in ("ORG", "NORP"):
                roles.append(ent.text)

        # Also check for role nouns (doctor, nurse, teacher, etc.)
        role_nouns = {"doctor", "nurse", "teacher", "therapist", "manager",
                      "boss", "colleague", "friend", "patient", "client",
                      "professor", "student", "officer"}
        for token in doc:
            if token.text.lower() in role_nouns and token.pos_ == "NOUN":
                roles.append(token.text)

        found = len(persons) > 0 or len(roles) > 0
        return {
            "found": found,
            "persons": persons[:5],
            "roles": list(set(roles))[:5],
        }

    @staticmethod
    def _detect_topic(doc) -> dict:
        """Use dependency parsing to find subject clauses / main topics."""
        subjects = []
        for token in doc:
            # Find nominal subjects (nsubj) and their subtrees
            if token.dep_ in ("nsubj", "nsubjpass") and token.head.pos_ == "VERB":
                subject_span = " ".join([t.text for t in token.subtree])
                subjects.append(subject_span)

        # Also find prepositional topics after 'about' / 'regarding'
        topic_preps = {"about", "regarding", "concerning", "on", "discussing"}
        prep_topics = []
        for token in doc:
            if token.text.lower() in topic_preps and token.dep_ == "prep":
                obj = " ".join([t.text for t in token.subtree])
                prep_topics.append(obj)

        found = len(subjects) > 0 or len(prep_topics) > 0
        return {
            "found": found,
            "subjects": subjects[:5],
            "prep_topics": prep_topics[:5],
        }

    @staticmethod
    def _detect_outcome(doc, transcript: str) -> dict:
        """Detect agreement/decision language."""
        lower = transcript.lower()
        found_keywords = []
        for kw in OUTCOME_KEYWORDS:
            if kw in lower:
                found_keywords.append(kw)

        found = len(found_keywords) > 0
        return {
            "found": found,
            "keywords": found_keywords[:10],
        }


nlp_service = NLPService()
