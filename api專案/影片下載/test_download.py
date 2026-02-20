from src.core import Downloader
import os

def test_downloader():
    dl = Downloader()
    print(f"Testing downloader with path: {dl.download_path}")
    
    # A short, safe test video (e.g., a 5-second countdown or similar, or just a sample from yt-dlp test suite if available, but a real URL is better for end-to-end)
    # Using a reliable short video: "Test Video for Video Downloader" - there aren't many guaranteed ones that stay up forever.
    # Let's use a very popular, short video. "Me at the zoo" is a classic, but maybe too big? 19 seconds. Good enough.
    # URL: https://www.youtube.com/watch?v=jNQXAC9IVRw
    
    url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
    print(f"Downloading: {url}")
    
    result = dl.download_video(url)
    print("Result:", result)
    
    if result["status"] == "success":
        if os.path.exists(result["filename"]):
            print("File successfully created!")
            # Clean up potentially if it was just a test? Or leave it for the user to see.
            # I'll leave it.
        else:
            print("File NOT found despite success status.")
    else:
        print("Download failed.")

if __name__ == "__main__":
    test_downloader()
