import ffmpeg
import os
import uuid

class AudioService:
    def __init__(self, upload_dir="./uploads"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    def convert_webm_to_wav(self, webm_path: str) -> str:
        """
        Converts a webm/ogg audio file from the browser to a 16kHz mono WAV file 
        for AI model compatibility.
        """
        wav_path = webm_path.rsplit('.', 1)[0] + ".wav"
        try:
            (
                ffmpeg
                .input(webm_path)
                .output(wav_path, ac=1, ar=16000)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            return wav_path
        except ffmpeg.Error as e:
            error_message = e.stderr.decode() if e.stderr else str(e)
            print(f"FFmpeg Error: {error_message}")
            raise Exception(f"Failed to convert audio: {error_message}")

    def cleanup(self, *file_paths):
        """
        Safely deletes temporary files.
        """
        for path in file_paths:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception as e:
                    print(f"Failed to delete {path}: {e}")

audio_service = AudioService()
