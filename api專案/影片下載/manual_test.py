import os
import sys

# Ensure src module can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.core import Downloader

def test_download():
    url = "https://www.youtube.com/watch?v=fa8k8IQ1_X0"
    dl = Downloader()
    
    print(f"Testing download for: {url}")
    print("-" * 50)
    
    # Test 1: Video Download
    print("\n1. Testing Video Download (MP4)...")
    try:
        result_video = dl.download_video(url, format_type="video")
        if result_video["status"] == "success":
            print("✅ Video Download Success!")
            print(f"   Title: {result_video['title']}")
            print(f"   File: {result_video['filename']}")
        else:
            print("❌ Video Download Failed!")
            print(f"   Error: {result_video.get('message')}")
    except Exception as e:
        print(f"❌ Exception during video download: {str(e)}")

    print("-" * 50)

    # Test 2: Audio Download
    print("\n2. Testing Audio Download (MP3)...")
    try:
        result_audio = dl.download_video(url, format_type="audio")
        if result_audio["status"] == "success":
            print("✅ Audio Download Success!")
            print(f"   Title: {result_audio['title']}")
            print(f"   File: {result_audio['filename']}")
        else:
            print("❌ Audio Download Failed!")
            print(f"   Error: {result_audio.get('message')}")
    except Exception as e:
        print(f"❌ Exception during audio download: {str(e)}")

if __name__ == "__main__":
    test_download()
