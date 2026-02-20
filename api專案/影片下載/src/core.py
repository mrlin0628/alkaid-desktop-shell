import os
import yt_dlp
from pathlib import Path

class Downloader:
    def __init__(self, download_dir: str = None):
        if download_dir:
            self.download_path = Path(download_dir)
        else:
            # Default to User's Downloads folder
            self.download_path = Path.home() / "Downloads"
        
        if not self.download_path.exists():
            self.download_path.mkdir(parents=True, exist_ok=True)

    def download_video(self, url: str, format_type: str = "video"):
        """Legacy synchronous method - kept for compatibility if needed, but we will focus on the streaming one."""
        # Just consume the stream and return the final result
        last_result = None
        for data in self.download_stream(url, format_type):
            if isinstance(data, dict):
                last_result = data
        return last_result

    def download_stream(self, url: str, format_type: str = "video"):
        """Generator that yields progress updates."""
        import queue
        import threading
        import json
        import time
        import re

        q = queue.Queue()
        
        def progress_hook(d):
            # print(f"DEBUG_HOOK keys: {list(d.keys())}") 
            if d['status'] == 'downloading':
                try:
                    p_str = d.get('_percent_str', '0%')
                    # Remove ANSI escape codes
                    p_str = re.sub(r'\x1b\[[0-9;]*m', '', p_str)
                    p = p_str.replace('%', '')
                    
                    speed = d.get('_speed_str', 'N/A')
                    # Clean speed string too just in case
                    speed = re.sub(r'\x1b\[[0-9;]*m', '', speed)
                    
                    eta = d.get('_eta_str', 'N/A')
                    eta = re.sub(r'\x1b\[[0-9;]*m', '', eta)
                    
                    q.put({
                        "status": "progress",
                        "percent": float(p) if p != 'N/A' else 0,
                        "speed": speed,
                        "eta": eta
                    })
                except Exception as e:
                    print(f"HOOK ERROR: {e}")
            elif d['status'] == 'finished':
                q.put({"status": "processing", "message": "Processing media..."})

        def run_download():
            if format_type == "audio":
                ydl_opts = {
                    'format': 'bestaudio[ext=m4a]/best',
                    'outtmpl': str(self.download_path / '%(title)s.%(ext)s'),
                    'quiet': True,
                    'no_warnings': True,
                    'progress_hooks': [progress_hook]
                }
                ext = '.m4a'
            else:
                ydl_opts = {
                    'format': 'bestvideo+bestaudio/best',
                    'outtmpl': str(self.download_path / '%(title)s.%(ext)s'),
                    'merge_output_format': 'mkv',
                    'noplaylist': True,
                    'quiet': True,
                    'no_warnings': True,
                    'progress_hooks': [progress_hook]
                }
                ext = '.mkv'

            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    filename = ydl.prepare_filename(info)
                    final_filename = filename.rsplit('.', 1)[0] + ext
                    
                    q.put({
                        "status": "success",
                        "title": info.get('title'),
                        "uploader": info.get('uploader'),
                        "filename": final_filename,
                        "basename": Path(final_filename).name,
                        "format_type": format_type
                    })
            except Exception as e:
                q.put({"status": "error", "message": str(e)})
            finally:
                q.put(None) # Sentinel

        # Start download thread
        t = threading.Thread(target=run_download)
        t.start()

        # Yield from queue
        while True:
            item = q.get()
            if item is None:
                break
            yield item

if __name__ == "__main__":
    # Test
    dl = Downloader()
    print(f"Download dir: {dl.download_path}")
