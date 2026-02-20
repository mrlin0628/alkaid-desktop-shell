from src.core import Downloader
import json
from pathlib import Path

def test_download():
    dl = Downloader()
    print(f"Download Path: {dl.download_path}")
    
    url = "https://youtu.be/LIPLTKNNYUQ?si=7MtBN41UdSlhdgKt" # Short video
    print(f"Testing URL: {url}")
    
    print("Starting download stream...")
    last_result = None
    for event in dl.download_stream(url, "video"):
        if event['status'] == 'success':
            last_result = event
            print("\nSUCCESS EVENT:")
            print(json.dumps(event, indent=2, ensure_ascii=False))
        elif event['status'] == 'error':
            print(f"\nERROR: {event['message']}")
            return

    if last_result:
        filename_from_core = last_result['filename']
        print(f"\nFilename from core: {filename_from_core}")
        
        # Check if file exists
        if os.path.exists(filename_from_core):
            print("File exists at absolute path!")
        else:
            print("File NOT found at absolute path.")
            
        # Check relative path logic
        try:
            basename = Path(filename_from_core).name
            print(f"Basename: {basename}")
            constructed_path = dl.download_path / basename
            print(f"Constructed path from basename: {constructed_path}")
            if constructed_path.exists():
                print("File exists via constructed path!")
            else:
                 print("File NOT found via constructed path.")
                 
            # Check what server.py would do if passed the full path vs basename
            print(f"Server logic with basename: {(dl.download_path / basename)}")
            # print(f"Server logic with full path: {(dl.download_path / filename_from_core)}") 
        except Exception as e:
            print(f"Path logic check failed: {e}")

import os
if __name__ == "__main__":
    test_download()
