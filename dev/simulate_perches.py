#!/usr/bin/env python3
"""Simulate perches connecting to the Dashboard for testing."""
import asyncio
import argparse
import uuid
import time
import aiohttp


async def simulate_perch(agent_id: str, dashboard_url: str, iterations: int = 5):
    """Simulate a single perch sending traces."""
    print(f"[{agent_id}] Starting perch simulation...")
    
    async with aiohttp.ClientSession() as session:
        # Check health
        try:
            async with session.get(f"{dashboard_url}/health") as resp:
                if resp.status != 200:
                    print(f"[{agent_id}] Dashboard not available at {dashboard_url}")
                    return
        except Exception as e:
            print(f"[{agent_id}] Cannot connect to {dashboard_url}: {e}")
            return
        
        # Register
        registration_data = {
            "agent_id": agent_id,
            "model_info": {"model_name": "simulated-model", "model_type": "demo"}
        }
        async with session.post(
            f"{dashboard_url}/api/v1/agents/register",
            json=registration_data
        ) as resp:
            result = await resp.json()
            print(f"[{agent_id}] Registered: {result.get('status')}")
        
        # Send traces
        for i in range(iterations):
            traces = {
                f"layer_{j}": {"shape": [1, 768], "mock": True}
                for j in range(3)
            }
            trace_data = {
                "agent_id": agent_id,
                "traces": traces,
                "metadata": {
                    "timestamp": time.time(),
                    "iteration": i + 1,
                    "model_info": {"model_name": "simulated-model"}
                }
            }
            
            async with session.post(
                f"{dashboard_url}/api/v1/traces",
                json=trace_data
            ) as resp:
                success = resp.status == 200
                print(f"[{agent_id}] Sent traces #{i+1}: {'✓' if success else '✗'}")
            
            await asyncio.sleep(2)
    
    print(f"[{agent_id}] Done")


async def main():
    parser = argparse.ArgumentParser(description="Simulate perches")
    parser.add_argument('--url', default='http://localhost:8080', help='Dashboard URL')
    parser.add_argument('--num-perches', type=int, default=3, help='Number of perches')
    parser.add_argument('--iterations', type=int, default=5, help='Traces per perch')
    args = parser.parse_args()
    
    print(f"Simulating {args.num_perches} perches → {args.url}")
    print("-" * 50)
    
    tasks = [
        simulate_perch(
            f"perch-{uuid.uuid4().hex[:6]}",
            args.url,
            args.iterations
        )
        for _ in range(args.num_perches)
    ]
    
    await asyncio.gather(*tasks)
    print("\nAll perches finished!")


if __name__ == '__main__':
    asyncio.run(main())
