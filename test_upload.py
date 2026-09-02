"""Test script to verify multipart upload works"""
import requests
import io

# Create a simple test PDF-like content (plain text for testing)
test_content = b"""This is a test document for upload testing.
It contains multiple lines of text that should be parsed.
The RAG system should extract this text and create chunks.
This is paragraph two with more content.
Testing the upload speed optimization with multipart/form-data."""

# Prepare multipart form data
files = {
    'file': ('test_document.txt', io.BytesIO(test_content), 'text/plain')
}
data = {
    'studentId': 'test-student-123',
    'course': 'Test Course'
}

print("Testing multipart upload to http://localhost:8000/api/materials/upload")
print(f"File size: {len(test_content)} bytes")

try:
    response = requests.post(
        'http://localhost:8000/api/materials/upload',
        files=files,
        data=data,
        timeout=30
    )
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response body:\n{response.text}")
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            material = result.get('material', {})
            print(f"\n[SUCCESS] Upload successful!")
            print(f"  Material ID: {material.get('id')}")
            print(f"  Pages extracted: {material.get('pages')}")
            print(f"  Chunks created: {result.get('chunks')}")
        else:
            print(f"\n[FAILED] Upload failed: {result.get('error')}")
    else:
        print(f"\n[ERROR] HTTP error: {response.status_code}")
        
except Exception as e:
    print(f"\n[ERROR] {e}")
