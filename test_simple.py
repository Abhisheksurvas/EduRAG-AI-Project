"""Simple test to check multipart upload"""
import requests
import io

test_content = b"This is a test document for upload testing.\nMultiple lines of text."

files = {'file': ('test.txt', io.BytesIO(test_content), 'text/plain')}
data = {'studentId': 'test-123', 'course': 'Test'}

print("Sending multipart request...")
print(f"Data fields: {data}")
print(f"File size: {len(test_content)} bytes\n")

try:
    # Prepare the request
    req = requests.Request('POST', 'http://localhost:8000/api/materials/upload', files=files, data=data)
    prepared = req.prepare()
    
    print(f"Content-Type header: {prepared.headers.get('Content-Type', 'MISSING')}\n")
    
    # Send it
    session = requests.Session()
    response = session.send(prepared, timeout=30)
    
    print(f"Response: {response.status_code}")
    print(response.text)
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            print("\n[SUCCESS] Upload worked!")
            print(f"  Chunks: {result.get('chunks')}")
        else:
            print(f"\n[FAILED] {result.get('error')}")
    else:
        print(f"\n[ERROR] Status {response.status_code}")
        
except requests.exceptions.RequestException as e:
    print(f"\n[ERROR] Request failed: {e}")
except Exception as e:
    print(f"\n[ERROR] {e}")
