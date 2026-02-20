import requests
import json
import sys
import time

def test_audio_converter_api():
    url = "http://localhost:5174/api/test/audio-converter"
    print(f"Testing API endpoint: {url}")
    print("--------------------------------------------------")
    
    try:
        # Send POST request with stream=True to handle SSE
        # Bypass proxies to ensure localhost works
        session = requests.Session()
        session.trust_env = False
        response = session.post(url, json={"test": True}, stream=True)
        
        if response.status_code != 200:
            print(f"❌ Connection Failed: Status Code {response.status_code}")
            return

        print("✔ Connection Established. Receiving stream...")
        
        result_received = False
        log_count = 0
        
        # Iterate over lines in the response stream
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                
                # Check for SSE data lines
                if decoded_line.startswith("data: "):
                    try:
                        json_str = decoded_line[6:] # Remove 'data: ' prefix
                        data = json.loads(json_str)
                        
                        if data.get("type") == "log":
                            log_count += 1
                            print(f"[LOG] {data.get('message')}")
                            
                        elif data.get("type") == "result":
                            result_received = True
                            print(f"✔ [RESULT] {data.get('data')}")
                            
                        elif data.get("type") == "error":
                            print(f"❌ [ERROR] {data.get('message')}")
                            
                    except json.JSONDecodeError:
                        print(f"⚠ [PARSE ERROR] Could not parse line: {decoded_line}")
                    except Exception as e:
                        print(f"⚠ [ERROR] {e}")

        print("--------------------------------------------------")
        if result_received:
            print("TEST RESULT: PASS ✅")
            print("The backend correctly parsed the result JSON from the stream.")
        else:
            print("TEST RESULT: FAIL ❌")
            print("The backend logic did NOT emit a result event. The fix may be incomplete.")

    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection Error: {e}")
        print("Is the server running?")
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")

if __name__ == "__main__":
    test_audio_converter_api()
