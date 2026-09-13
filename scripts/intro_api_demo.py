import json
from urllib import error, request


API_BASE_URL = "https://resume-backend-fnjs.onrender.com"

SAMPLE_DOCUMENTS = [
    {
        "name": "John Doe",
        "dateOfBirth": "2010-12-25",
        "address": "No 10, Downing Street\nWhite House\nNew York - 100 011",
        "phone": "+1-405-234-4434",
    },
    {
        "name": "Shail",
        "dateOfBirth": "2001-08-28",
        "address": "No 1, Rajpath\nR Bhavan\nNew Delhi - 110 001",
        "phone": "+91-111-222-3333",
    },
]


def call_api(method: str, path: str, payload: dict | None = None) -> dict:
    url = f"{API_BASE_URL}{path}"
    data = None
    headers = {"Content-Type": "application/json"}

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = request.Request(url, data=data, headers=headers, method=method)

    try:
        with request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        details = exc.read().decode("utf-8")
        raise RuntimeError(f"{method} {url} failed: {exc.code} {details}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Unable to reach {url}: {exc.reason}") from exc


def create_sample_documents() -> None:
    print("Creating Intro documents...\n")
    for document in SAMPLE_DOCUMENTS:
        result = call_api("POST", "/api/intros", document)
        print(f"Created: {result['data']['name']} ({result['data']['id']})")


def list_documents() -> None:
    print("\nReading Intro documents from MongoDB through the backend API...\n")
    result = call_api("GET", "/api/intros")

    for item in result.get("data", []):
        print(f"Name: {item['name']}")
        print(f"Date of birth: {item['dateOfBirth']}")
        print("Address:")
        print(item["address"])
        print(f"Phone: {item['phone']}")
        print("-" * 40)


if __name__ == "__main__":
    create_sample_documents()
    list_documents()