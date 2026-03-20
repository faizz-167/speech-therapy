import asyncio
from httpx import AsyncClient, ASGITransport
from main import app

async def test_foundation():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        print("Testing GET /api/v1/baselines")
        response = await ac.get("/api/v1/baselines")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Data count: len({len(response.json())})")
            print("First item:", response.json()[0] if response.json() else "Empty")
        else:
            print(response.text)

        print("\nTesting GET /api/v1/tasks")
        response = await ac.get("/api/v1/tasks")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print(f"Data count: len({len(response.json())})")
            print("First item:", response.json()[0] if response.json() else "Empty")
        else:
            print(response.text)

if __name__ == "__main__":
    asyncio.run(test_foundation())
