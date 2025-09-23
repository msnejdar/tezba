#!/usr/bin/env python3
"""
Claude Flow Hive Mind Client
Python client for interacting with Claude Flow Hive Mind API
"""

import asyncio
import aiohttp
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class HiveMindConfig:
    """Configuration for Claude Flow Hive Mind"""
    objective: str
    name: str = ""
    queen_type: str = "strategic"
    max_workers: int = 8
    consensus_algorithm: str = "majority"
    auto_scale: bool = True
    encryption: bool = False
    memory_size: int = 100
    task_timeout: int = 60

class ClaudeFlowClient:
    """Client for interacting with Claude Flow Hive Mind API"""
    
    def __init__(self, base_url: str = "http://localhost:5001"):
        self.base_url = base_url.rstrip('/')
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make HTTP request to the API"""
        if not self.session:
            raise RuntimeError("Client session not initialized. Use 'async with' context manager.")
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with self.session.request(method, url, json=data) as response:
                response.raise_for_status()
                return await response.json()
        except aiohttp.ClientError as e:
            logger.error(f"Request failed: {e}")
            raise
    
    async def initialize_hive_mind(self, config: HiveMindConfig) -> Dict[str, Any]:
        """Initialize a new hive mind"""
        data = {
            "objective": config.objective,
            "name": config.name,
            "queen_type": config.queen_type,
            "max_workers": config.max_workers,
            "consensus_algorithm": config.consensus_algorithm,
            "auto_scale": config.auto_scale,
            "encryption": config.encryption,
            "memory_size": config.memory_size,
            "task_timeout": config.task_timeout
        }
        
        return await self._make_request("POST", "/api/hive-mind/init", data)
    
    async def create_task(self, swarm_id: str, description: str, priority: int = 5, metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """Create a new task"""
        data = {
            "description": description,
            "priority": priority,
            "metadata": metadata or {}
        }
        
        return await self._make_request("POST", f"/api/hive-mind/{swarm_id}/task", data)
    
    async def build_consensus(self, swarm_id: str, topic: str, options: List[str]) -> Dict[str, Any]:
        """Build consensus for a decision"""
        data = {
            "topic": topic,
            "options": options
        }
        
        return await self._make_request("POST", f"/api/hive-mind/{swarm_id}/consensus", data)
    
    async def get_status(self, swarm_id: str) -> Dict[str, Any]:
        """Get hive mind status"""
        return await self._make_request("GET", f"/api/hive-mind/{swarm_id}/status")
    
    async def list_hive_minds(self) -> List[Dict[str, Any]]:
        """List all active hive minds"""
        return await self._make_request("GET", "/api/hive-mind/list")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check API health"""
        return await self._make_request("GET", "/health")


# Example usage and testing
async def main():
    """Example usage of Claude Flow Hive Mind Client"""
    
    async with ClaudeFlowClient() as client:
        try:
            # Health check
            health = await client.health_check()
            print(f"Health: {health}")
            
            # Initialize hive mind
            config = HiveMindConfig(
                objective="Build a comprehensive documentation system for our API",
                name="docs-hive",
                queen_type="strategic",
                max_workers=6
            )
            
            result = await client.initialize_hive_mind(config)
            swarm_id = result["swarm_id"]
            print(f"Initialized hive mind: {swarm_id}")
            
            # Create tasks
            tasks = [
                "Analyze existing API endpoints and their documentation status",
                "Create comprehensive API documentation with examples",
                "Build interactive API explorer interface",
                "Write developer tutorials and getting started guide",
                "Implement automated documentation testing",
                "Review and validate all documentation for accuracy"
            ]
            
            created_tasks = []
            for i, task_desc in enumerate(tasks):
                task = await client.create_task(swarm_id, task_desc, priority=5-i%3)
                created_tasks.append(task)
                print(f"Created task: {task['id']} - {task['description'][:50]}...")
            
            # Wait a bit for tasks to process
            await asyncio.sleep(3)
            
            # Build consensus on documentation format
            consensus = await client.build_consensus(
                swarm_id,
                "Choose documentation format",
                ["OpenAPI/Swagger", "GitBook", "Custom HTML", "Markdown"]
            )
            print(f"Consensus reached: {consensus['result']} (confidence: {consensus['confidence']:.2f})")
            
            # Check status
            status = await client.get_status(swarm_id)
            print(f"\nHive Mind Status:")
            print(f"  Status: {status['status']}")
            print(f"  Workers: {len(status['workers'])}")
            print(f"  Tasks: {status['tasks']['total']} total, {status['tasks']['completed']} completed")
            print(f"  Decisions: {status['decisions']}")
            
            # Wait for more task completion
            await asyncio.sleep(10)
            
            # Final status check
            final_status = await client.get_status(swarm_id)
            print(f"\nFinal Status:")
            print(f"  Tasks completed: {final_status['tasks']['completed']}/{final_status['tasks']['total']}")
            print(f"  Tasks in progress: {final_status['tasks']['in_progress']}")
            print(f"  Worker efficiency: {len([w for w in final_status['workers'] if w['status'] == 'idle'])}/{len(final_status['workers'])} idle")
            
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())