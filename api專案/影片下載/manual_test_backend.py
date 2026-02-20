from src.core import Downloader
import sys
import time
import os

def test_stream(url):
    print(f"Testing download stream for: {url}")
    test_dir = os.path.join(os.getcwd(), "test_downloads")
    # Ensure dir exists
    if not os.path.exists(test_dir):
        os.makedirs(test_dir)
        
    # Clean up formatted file
    import shutil
    for f in os.listdir(test_dir):
        os.remove(os.path.join(test_dir, f))
        
    dl = Downloader(test_dir)
    print(f"Download Directory: {test_dir}")
    
    print("Starting stream...")
    start_time = time.time()
    count = 0
    
    try:
        for event in dl.download_stream(url, "video"):
            count += 1
            if event['status'] == 'progress':
                # Show raw event to debug if percent is missing
                # sys.stdout.write(f"\r{event}")
                sys.stdout.write(f"\rProgress: {event.get('percent')}% | Speed: {event.get('speed')} | ETA: {event.get('eta')}")
                sys.stdout.flush()
            elif event['status'] == 'finished':
                print(f"\n[FINISHED] {event.get('message', '')}")
            elif event['status'] == 'success':
                print(f"\n[SUCCESS] Saved to: {event['filename']}")
            elif event['status'] == 'error':
                print(f"\n[ERROR] {event['message']}")
            else:
                print(f"\n[UNKNOWN] {event}")
                
    except Exception as e:
        print(f"\n[EXCEPTION] {e}")
    
    print(f"\nStream ended. Total events: {count}")
    print(f"Time taken: {time.time() - start_time:.2f}s")
    
    # Clean up file to save space? Nah, keep for verification if needed.

if __name__ == "__main__":
    test_url = "https://www.youtube.com/watch?v=QTq1Z_U2RyA"
    test_stream(test_url)
