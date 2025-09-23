#!/usr/bin/env python3
"""
Claude Flow Hive Mind Integration for Vercel
Serverless implementation of Claude Flow Hive Mind architecture
"""

import os
import json
import asyncio
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import uuid

# Vercel serverless function
from flask import Flask, request, jsonify
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
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

@dataclass
class Task:
    """Task representation"""
    id: str
    description: str
    priority: int = 5
    status: str = "pending"
    created_at: str = ""
    assigned_to: Optional[str] = None
    result: Optional[str] = None
    metadata: Dict[str, Any] = None

class ClaudeFlowHiveMind:
    """Serverless Claude Flow Hive Mind implementation"""
    
    def __init__(self, config: HiveMindConfig):
        self.config = config
        self.swarm_id = f"hive-{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:8]}"
        self.state = {
            "status": "initializing",
            "swarm_id": self.swarm_id,
            "queen": None,
            "workers": {},
            "tasks": {},
            "decisions": {},
            "metrics": {
                "tasks_created": 0,
                "tasks_completed": 0,
                "decisions_reached": 0,
                "memory_usage": 0
            }
        }
        
    async def initialize(self) -> Dict[str, Any]:
        """Initialize the hive mind swarm"""
        try:
            self.state["status"] = "initializing"
            
            # Generate unique config name if not provided
            if not self.config.name:
                self.config.name = f"hive-{int(datetime.now().timestamp())}"
            
            # Initialize swarm topology
            topology = self._determine_topology()
            
            # Setup queen coordinator
            queen_data = await self._spawn_queen()
            
            # Initialize workers based on objective
            worker_types = self._determine_worker_types()
            workers = await self._spawn_workers(worker_types)
            
            self.state["status"] = "ready"
            
            return {
                "swarm_id": self.swarm_id,
                "status": "ready",
                "queen": queen_data,
                "workers": workers,
                "topology": topology,
                "config": asdict(self.config)
            }
            
        except Exception as error:
            self.state["status"] = "error"
            logger.error(f"Failed to initialize hive mind: {error}")
            raise error
    
    def _determine_topology(self) -> str:
        """Determine optimal topology based on objective"""
        objective = self.config.objective.lower()
        
        if any(keyword in objective for keyword in ['research', 'analysis']):
            return 'mesh'  # Peer-to-peer for collaborative research
        elif any(keyword in objective for keyword in ['build', 'develop']):
            return 'hierarchical'  # Clear command structure for development
        elif any(keyword in objective for keyword in ['monitor', 'maintain']):
            return 'ring'  # Circular for continuous monitoring
        elif any(keyword in objective for keyword in ['coordinate', 'orchestrate']):
            return 'star'  # Centralized for coordination
        
        return 'hierarchical'  # Default
    
    async def _spawn_queen(self) -> Dict[str, Any]:
        """Spawn the queen coordinator"""
        queen_id = f"queen-{uuid.uuid4().hex[:8]}"
        
        queen_data = {
            "id": queen_id,
            "type": self.config.queen_type,
            "status": "active",
            "decisions": 0,
            "tasks": 0,
            "spawned_at": datetime.now(timezone.utc).isoformat()
        }
        
        self.state["queen"] = queen_data
        return queen_data
    
    def _determine_worker_types(self) -> List[str]:
        """Determine worker types based on objective"""
        objective = self.config.objective.lower()
        worker_types = []
        
        # Base worker types
        if any(keyword in objective for keyword in ['code', 'implement', 'build', 'develop']):
            worker_types.extend(['coder', 'architect'])
        
        if any(keyword in objective for keyword in ['research', 'investigate', 'analyze']):
            worker_types.extend(['researcher', 'analyst'])
        
        if any(keyword in objective for keyword in ['test', 'validate', 'quality']):
            worker_types.append('tester')
        
        if any(keyword in objective for keyword in ['review', 'feedback', 'audit']):
            worker_types.append('reviewer')
        
        if any(keyword in objective for keyword in ['optimize', 'performance', 'efficiency']):
            worker_types.append('optimizer')
        
        if any(keyword in objective for keyword in ['document', 'explain', 'manual']):
            worker_types.append('documenter')
        
        # Ensure we have at least some workers
        if not worker_types:
            worker_types = ['coder', 'researcher', 'analyst']
        
        # Limit to max_workers
        return worker_types[:self.config.max_workers]
    
    async def _spawn_workers(self, worker_types: List[str]) -> List[Dict[str, Any]]:
        """Spawn worker agents"""
        workers = []
        
        for i, worker_type in enumerate(worker_types):
            worker_id = f"worker-{i}-{uuid.uuid4().hex[:8]}"
            
            worker = {
                "id": worker_id,
                "type": worker_type,
                "status": "idle",
                "tasks_completed": 0,
                "current_task": None,
                "spawned_at": datetime.now(timezone.utc).isoformat(),
                "performance": {
                    "avg_task_time": 0,
                    "success_rate": 1.0
                }
            }
            
            workers.append(worker)
            self.state["workers"][worker_id] = worker
        
        return workers
    
    async def create_task(self, description: str, priority: int = 5, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Create and assign a task"""
        task_id = f"task-{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:8]}"
        
        task = Task(
            id=task_id,
            description=description,
            priority=priority,
            status="pending",
            created_at=datetime.now(timezone.utc).isoformat(),
            metadata=metadata or {}
        )
        
        # Add complexity estimation
        task.metadata["complexity"] = self._analyze_task_complexity(description)
        task.metadata["estimated_duration"] = self._estimate_task_duration(description)
        
        self.state["tasks"][task_id] = asdict(task)
        self.state["metrics"]["tasks_created"] += 1
        
        # Find best worker for task
        best_worker = self._find_best_worker(task)
        if best_worker:
            await self._assign_task(best_worker["id"], task_id)
        
        return asdict(task)
    
    def _analyze_task_complexity(self, description: str) -> str:
        """Analyze task complexity based on description"""
        words = description.lower().split()
        
        high_complexity = ['optimize', 'refactor', 'architecture', 'design', 'algorithm']
        medium_complexity = ['implement', 'build', 'create', 'develop', 'integrate']
        low_complexity = ['list', 'show', 'get', 'read', 'display']
        
        for word in words:
            if any(keyword in word for keyword in high_complexity):
                return 'high'
            elif any(keyword in word for keyword in medium_complexity):
                return 'medium'
            elif any(keyword in word for keyword in low_complexity):
                return 'low'
        
        return 'medium'
    
    def _estimate_task_duration(self, description: str) -> int:
        """Estimate task duration in milliseconds"""
        words = description.lower().split()
        
        complexity_map = {
            'simple': ['list', 'show', 'display', 'get', 'read'],
            'medium': ['create', 'update', 'modify', 'change', 'build'],
            'complex': ['analyze', 'optimize', 'refactor', 'implement', 'design']
        }
        
        score = 1
        for word in words:
            if any(keyword in word for keyword in complexity_map['complex']):
                score += 3
            elif any(keyword in word for keyword in complexity_map['medium']):
                score += 2
            elif any(keyword in word for keyword in complexity_map['simple']):
                score += 1
        
        return min(score * 5000, 60000)  # Cap at 1 minute
    
    def _find_best_worker(self, task: Task) -> Optional[Dict[str, Any]]:
        """Find the best worker for a task"""
        available_workers = [w for w in self.state["workers"].values() if w["status"] == "idle"]
        
        if not available_workers:
            return None
        
        task_lower = task.description.lower()
        
        # Priority mapping for worker types
        priority_map = {
            'researcher': ['research', 'investigate', 'analyze', 'study'],
            'coder': ['code', 'implement', 'build', 'develop', 'fix', 'create'],
            'analyst': ['analyze', 'data', 'metrics', 'performance', 'report'],
            'tester': ['test', 'validate', 'check', 'verify', 'quality'],
            'architect': ['design', 'architecture', 'structure', 'plan'],
            'reviewer': ['review', 'feedback', 'improve', 'refactor'],
            'optimizer': ['optimize', 'performance', 'speed', 'efficiency'],
            'documenter': ['document', 'explain', 'write', 'describe']
        }
        
        best_worker = None
        best_score = 0
        
        for worker in available_workers:
            keywords = priority_map.get(worker["type"], [])
            keyword_score = sum(1 for keyword in keywords if keyword in task_lower)
            performance_bonus = worker["performance"]["success_rate"] * 0.5
            total_score = keyword_score + performance_bonus
            
            if total_score > best_score:
                best_score = total_score
                best_worker = worker
        
        return best_worker or available_workers[0]
    
    async def _assign_task(self, worker_id: str, task_id: str):
        """Assign task to worker"""
        worker = self.state["workers"].get(worker_id)
        task = self.state["tasks"].get(task_id)
        
        if not worker or not task:
            return
        
        worker["status"] = "busy"
        worker["current_task"] = task_id
        task["status"] = "in_progress"
        task["assigned_to"] = worker_id
        
        # Simulate task execution
        asyncio.create_task(self._execute_task(worker_id, task_id))
    
    async def _execute_task(self, worker_id: str, task_id: str):
        """Execute task with simulated processing"""
        worker = self.state["workers"].get(worker_id)
        task = self.state["tasks"].get(task_id)
        
        if not worker or not task:
            return
        
        try:
            # Simulate task execution based on complexity
            duration_map = {
                'low': 2,
                'medium': 5,
                'high': 10
            }
            
            complexity = task.get("metadata", {}).get("complexity", "medium")
            duration = duration_map.get(complexity, 5)
            
            await asyncio.sleep(duration)
            
            # Complete task
            task["status"] = "completed"
            task["result"] = f"Task completed by {worker['type']} worker"
            task["completed_at"] = datetime.now(timezone.utc).isoformat()
            
            worker["status"] = "idle"
            worker["current_task"] = None
            worker["tasks_completed"] += 1
            
            self.state["metrics"]["tasks_completed"] += 1
            
        except Exception as error:
            task["status"] = "failed"
            task["error"] = str(error)
            worker["status"] = "idle"
            worker["current_task"] = None
            logger.error(f"Task {task_id} failed: {error}")
    
    async def build_consensus(self, topic: str, options: List[str]) -> Dict[str, Any]:
        """Build consensus for a decision"""
        decision_id = f"decision-{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:8]}"
        
        decision = {
            "id": decision_id,
            "swarm_id": self.swarm_id,
            "topic": topic,
            "options": options,
            "votes": {},
            "algorithm": self.config.consensus_algorithm,
            "status": "voting",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Simulate voting process
        votes = {}
        
        # Workers vote
        for worker_id, worker in self.state["workers"].items():
            vote = options[hash(worker_id) % len(options)]  # Deterministic vote
            votes[worker_id] = vote
            decision["votes"][worker_id] = vote
        
        # Queen votes (weighted)
        if self.state["queen"]:
            queen_vote = options[0]  # Queen prefers first option
            votes["queen"] = queen_vote
            decision["votes"]["queen"] = queen_vote
        
        # Calculate consensus
        result = self._calculate_consensus(decision, votes)
        decision["result"] = result["decision"]
        decision["confidence"] = result["confidence"]
        decision["status"] = "completed"
        
        self.state["decisions"][decision_id] = decision
        self.state["metrics"]["decisions_reached"] += 1
        
        return decision
    
    def _calculate_consensus(self, decision: Dict, votes: Dict) -> Dict[str, Any]:
        """Calculate consensus based on algorithm"""
        vote_count = {}
        for vote in votes.values():
            vote_count[vote] = vote_count.get(vote, 0) + 1
        
        if decision["algorithm"] == "majority":
            # Simple majority
            sorted_votes = sorted(vote_count.items(), key=lambda x: x[1], reverse=True)
            winner = sorted_votes[0]
            return {
                "decision": winner[0],
                "confidence": winner[1] / len(votes)
            }
        
        elif decision["algorithm"] == "weighted":
            # Weight queen vote more heavily
            if "queen" in votes:
                queen_vote = votes["queen"]
                vote_count[queen_vote] = vote_count.get(queen_vote, 0) + 2
            
            sorted_votes = sorted(vote_count.items(), key=lambda x: x[1], reverse=True)
            winner = sorted_votes[0]
            return {
                "decision": winner[0],
                "confidence": winner[1] / (len(votes) + 2)
            }
        
        return {"decision": "unknown", "confidence": 0}
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status of the hive mind"""
        tasks = list(self.state["tasks"].values())
        workers = list(self.state["workers"].values())
        
        return {
            "swarm_id": self.swarm_id,
            "status": self.state["status"],
            "queen": self.state["queen"],
            "workers": workers,
            "tasks": {
                "total": len(self.state["tasks"]),
                "pending": len([t for t in tasks if t["status"] == "pending"]),
                "in_progress": len([t for t in tasks if t["status"] == "in_progress"]),
                "completed": len([t for t in tasks if t["status"] == "completed"]),
                "failed": len([t for t in tasks if t["status"] == "failed"])
            },
            "decisions": len(self.state["decisions"]),
            "metrics": self.state["metrics"]
        }


# Flask app for Vercel
app = Flask(__name__)

# Global hive mind instances
hive_minds: Dict[str, ClaudeFlowHiveMind] = {}

@app.route('/api/hive-mind/init', methods=['POST'])
def init_hive_mind():
    """Initialize a new hive mind"""
    try:
        data = request.get_json()
        
        config = HiveMindConfig(
            objective=data.get('objective', ''),
            name=data.get('name', ''),
            queen_type=data.get('queen_type', 'strategic'),
            max_workers=data.get('max_workers', 8),
            consensus_algorithm=data.get('consensus_algorithm', 'majority'),
            auto_scale=data.get('auto_scale', True),
            encryption=data.get('encryption', False),
            memory_size=data.get('memory_size', 100),
            task_timeout=data.get('task_timeout', 60)
        )
        
        hive_mind = ClaudeFlowHiveMind(config)
        
        # Run async initialization
        result = asyncio.run(hive_mind.initialize())
        
        # Store hive mind instance
        hive_minds[hive_mind.swarm_id] = hive_mind
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Failed to initialize hive mind: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/hive-mind/<swarm_id>/task', methods=['POST'])
def create_task(swarm_id):
    """Create a new task"""
    try:
        hive_mind = hive_minds.get(swarm_id)
        if not hive_mind:
            return jsonify({"error": "Hive mind not found"}), 404
        
        data = request.get_json()
        
        result = asyncio.run(hive_mind.create_task(
            description=data.get('description', ''),
            priority=data.get('priority', 5),
            metadata=data.get('metadata', {})
        ))
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Failed to create task: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/hive-mind/<swarm_id>/consensus', methods=['POST'])
def build_consensus(swarm_id):
    """Build consensus for a decision"""
    try:
        hive_mind = hive_minds.get(swarm_id)
        if not hive_mind:
            return jsonify({"error": "Hive mind not found"}), 404
        
        data = request.get_json()
        
        result = asyncio.run(hive_mind.build_consensus(
            topic=data.get('topic', ''),
            options=data.get('options', [])
        ))
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Failed to build consensus: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/hive-mind/<swarm_id>/status', methods=['GET'])
def get_status(swarm_id):
    """Get hive mind status"""
    try:
        hive_mind = hive_minds.get(swarm_id)
        if not hive_mind:
            return jsonify({"error": "Hive mind not found"}), 404
        
        result = hive_mind.get_status()
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/hive-mind/list', methods=['GET'])
def list_hive_minds():
    """List all active hive minds"""
    try:
        result = []
        for swarm_id, hive_mind in hive_minds.items():
            status = hive_mind.get_status()
            result.append({
                "swarm_id": swarm_id,
                "status": status["status"],
                "objective": hive_mind.config.objective,
                "workers": len(status["workers"]),
                "tasks": status["tasks"]["total"]
            })
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Failed to list hive minds: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "claude-flow-hive-mind"})

if __name__ == '__main__':
    app.run(debug=True, port=5001)