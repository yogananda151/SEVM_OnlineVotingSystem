import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:5000/api"

def make_req(url, method="GET", data=None, token=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    body = json.dumps(data).encode("utf-8") if data else None
    try:
        with urllib.request.urlopen(req, data=body) as response:
            status = response.getcode()
            content = response.read().decode("utf-8")
            return status, json.loads(content)
    except urllib.error.HTTPError as e:
        status = e.code
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return status, parsed

def test_api():
    print("[*] Logging in as Commissioner...")
    status, data = make_req(f"{BASE_URL}/auth/login", method="POST", data={
        "email": "commissioner@evm.gov.in",
        "password": "Admin@12345"
    })
    assert status == 200, f"Login failed: {data}"
    token = data["data"]["accessToken"]
    print("[OK] Logged in successfully!")

    print("[*] Fetching elections...")
    status, data = make_req(f"{BASE_URL}/elections", token=token)
    assert status == 200, f"Get elections failed: {data}"
    elections = data["data"]
    print(f"[OK] Elections count: {len(elections)}")
    for e in elections:
        print(f"     Election: {e['id']} - {e['name']} ({e['status']})")
    assert len(elections) > 0, "No elections found!"

    target_election = elections[0]

    print(f"[*] Fetching candidates for election {target_election['id']}...")
    status, data = make_req(f"{BASE_URL}/candidates?electionId={target_election['id']}", token=token)
    assert status == 200, f"Get candidates failed: {data}"
    candidates = data["data"]
    print(f"[OK] Total candidates: {len(candidates)}")

    # Pulivendula candidates
    pulivendula_candidates = [c for c in candidates if c.get("constituency") and "pulivendula" in c["constituency"]["name"].lower()]
    print(f"[OK] Pulivendula candidates ({len(pulivendula_candidates)}):")
    for c in pulivendula_candidates:
        party_name = c["party"]["name"] if c.get("party") else "Independent"
        print(f"     - #{c['serialNumber']}: {c['fullName']} [{party_name}]")

    assert len(pulivendula_candidates) >= 3, "Expected candidates in Pulivendula"

    tdp_cand = next((c for c in pulivendula_candidates if c.get("party") and c["party"]["abbreviation"] == "TDP"), None)
    assert tdp_cand is not None, "TDP candidate not found in Pulivendula"
    tdp_party_id = tdp_cand["party"]["id"]
    con_id = tdp_cand["constituencyId"]

    print(f"\n[*] Testing Rule: Attempting to register duplicate TDP candidate in Pulivendula...")
    status, dup_data = make_req(f"{BASE_URL}/candidates", method="POST", token=token, data={
        "electionId": target_election["id"],
        "constituencyId": con_id,
        "partyId": tdp_party_id,
        "fullName": "Fake Duplicate TDP Candidate",
        "age": 45,
        "serialNumber": 99,
        "isIndependent": False
    })
    print(f"Status Code: {status}")
    print(f"Response: {dup_data}")
    assert status == 409, f"Expected 409 conflict, got {status}"
    print("[PASS] Backend rejected duplicate party candidate with HTTP 409 Conflict!")

    print(f"\n[*] Testing registration of independent candidate...")
    status, indep_data = make_req(f"{BASE_URL}/candidates", method="POST", token=token, data={
        "electionId": target_election["id"],
        "constituencyId": con_id,
        "partyId": None,
        "fullName": "Test Independent Candidate",
        "age": 42,
        "serialNumber": 99,
        "isIndependent": True
    })
    assert status in [200, 201], f"Failed to register independent: {indep_data}"
    created_id = indep_data["data"]["id"]
    print(f"[PASS] Successfully registered independent candidate ID {created_id}!")

    # Cleanup
    make_req(f"{BASE_URL}/candidates/{created_id}", method="DELETE", token=token)
    print(f"[OK] Cleaned up test candidate.")
    print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_api()
