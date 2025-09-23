/**
 * Hive Mind Dashboard Component
 * Interactive dashboard for managing Claude Flow Hive Mind instances
 */

import React, { useState, useEffect, useCallback } from 'react';
import hiveService from '../services/hiveService';
import './HiveMindDashboard.css';

const HiveMindDashboard = () => {
  const [hiveMinds, setHiveMinds] = useState([]);
  const [selectedHive, setSelectedHive] = useState(null);
  const [hiveStatus, setHiveStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newHiveConfig, setNewHiveConfig] = useState({
    objective: '',
    name: '',
    queen_type: 'strategic',
    max_workers: 8,
    consensus_algorithm: 'majority'
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    description: '',
    priority: 5
  });
  const [monitorCleanup, setMonitorCleanup] = useState(null);

  // Load hive minds on component mount
  useEffect(() => {
    loadHiveMinds();
  }, []);

  // Monitor selected hive mind
  useEffect(() => {
    if (selectedHive) {
      startMonitoring(selectedHive);
    } else {
      stopMonitoring();
    }

    return () => stopMonitoring();
  }, [selectedHive, startMonitoring, stopMonitoring]);

  const loadHiveMinds = async () => {
    try {
      setLoading(true);
      const minds = await hiveService.listHiveMinds();
      setHiveMinds(minds);
    } catch (err) {
      setError(`Failed to load hive minds: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startMonitoring = useCallback(async (swarmId) => {
    try {
      const cleanup = await hiveService.monitorHiveMind(swarmId, (status) => {
        if (status.error) {
          setError(status.error);
        } else {
          setHiveStatus(status);
        }
      });
      setMonitorCleanup(() => cleanup);
    } catch (err) {
      setError(`Failed to start monitoring: ${err.message}`);
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    if (monitorCleanup) {
      monitorCleanup();
      setMonitorCleanup(null);
    }
  }, [monitorCleanup]);

  const createHiveMind = async () => {
    try {
      setLoading(true);
      const result = await hiveService.initializeHiveMind(newHiveConfig);
      
      // Add to list and select
      setHiveMinds(prev => [...prev, {
        swarm_id: result.swarm_id,
        status: result.status,
        objective: newHiveConfig.objective,
        workers: result.workers.length,
        tasks: 0
      }]);
      
      setSelectedHive(result.swarm_id);
      setShowCreateForm(false);
      setNewHiveConfig({
        objective: '',
        name: '',
        queen_type: 'strategic',
        max_workers: 8,
        consensus_algorithm: 'majority'
      });
    } catch (err) {
      setError(`Failed to create hive mind: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!selectedHive || !newTask.description.trim()) return;

    try {
      await hiveService.createTask(
        selectedHive,
        newTask.description,
        newTask.priority
      );
      
      setNewTask({ description: '', priority: 5 });
      
      // Refresh status will happen automatically via monitoring
    } catch (err) {
      setError(`Failed to create task: ${err.message}`);
    }
  };

  const buildConsensus = async () => {
    if (!selectedHive) return;

    try {
      const result = await hiveService.buildConsensus(
        selectedHive,
        'Choose next priority action',
        ['Optimize Performance', 'Add Features', 'Fix Bugs', 'Improve Documentation']
      );
      
      alert(`Consensus reached: ${result.result} (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
    } catch (err) {
      setError(`Failed to build consensus: ${err.message}`);
    }
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#FF9800';
      case 'failed': return '#F44336';
      case 'pending': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="hive-mind-dashboard">
      <header className="dashboard-header">
        <h1>🧠 Claude Flow Hive Mind Dashboard</h1>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="btn btn-primary"
          disabled={loading}
        >
          Create New Hive Mind
        </button>
      </header>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="dashboard-content">
        <aside className="hive-list">
          <h2>Active Hive Minds</h2>
          {loading && <div className="loading">Loading...</div>}
          
          {hiveMinds.map(hive => (
            <div 
              key={hive.swarm_id}
              className={`hive-item ${selectedHive === hive.swarm_id ? 'selected' : ''}`}
              onClick={() => setSelectedHive(hive.swarm_id)}
            >
              <div className="hive-name">{hive.objective.slice(0, 50)}...</div>
              <div className="hive-meta">
                <span className={`status ${hive.status}`}>{hive.status}</span>
                <span>{hive.workers} workers</span>
                <span>{hive.tasks} tasks</span>
              </div>
            </div>
          ))}
          
          {hiveMinds.length === 0 && !loading && (
            <div className="empty-state">No hive minds active</div>
          )}
        </aside>

        <main className="hive-details">
          {selectedHive && hiveStatus ? (
            <div className="hive-status">
              <div className="status-header">
                <h2>Hive Mind: {selectedHive}</h2>
                <div className="status-badges">
                  <span className={`badge ${hiveStatus.status}`}>{hiveStatus.status}</span>
                  <span className="badge">{hiveStatus.workers.length} workers</span>
                  <span className="badge">{hiveStatus.tasks.total} tasks</span>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric-card">
                  <h3>Tasks</h3>
                  <div className="task-breakdown">
                    <div style={{color: getTaskStatusColor('completed')}}>
                      Completed: {hiveStatus.tasks.completed}
                    </div>
                    <div style={{color: getTaskStatusColor('in_progress')}}>
                      In Progress: {hiveStatus.tasks.in_progress}
                    </div>
                    <div style={{color: getTaskStatusColor('pending')}}>
                      Pending: {hiveStatus.tasks.pending}
                    </div>
                    <div style={{color: getTaskStatusColor('failed')}}>
                      Failed: {hiveStatus.tasks.failed}
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <h3>Workers</h3>
                  <div className="worker-list">
                    {hiveStatus.workers.map(worker => (
                      <div key={worker.id} className={`worker-item ${worker.status}`}>
                        <span className="worker-type">{worker.type}</span>
                        <span className={`worker-status ${worker.status}`}>{worker.status}</span>
                        <span className="worker-tasks">{worker.tasks_completed} tasks</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="metric-card">
                  <h3>Queen Coordinator</h3>
                  {hiveStatus.queen ? (
                    <div className="queen-info">
                      <div>Type: {hiveStatus.queen.type}</div>
                      <div>Status: {hiveStatus.queen.status}</div>
                      <div>Decisions: {hiveStatus.queen.decisions}</div>
                      <div>Since: {formatTimestamp(hiveStatus.queen.spawned_at)}</div>
                    </div>
                  ) : (
                    <div>No queen active</div>
                  )}
                </div>

                <div className="metric-card">
                  <h3>Performance</h3>
                  <div className="performance-metrics">
                    <div>Total Tasks: {hiveStatus.metrics.tasks_created}</div>
                    <div>Completed: {hiveStatus.metrics.tasks_completed}</div>
                    <div>Decisions: {hiveStatus.metrics.decisions_reached}</div>
                    <div>Efficiency: {hiveStatus.tasks.total > 0 ? 
                      Math.round((hiveStatus.tasks.completed / hiveStatus.tasks.total) * 100) : 0}%</div>
                  </div>
                </div>
              </div>

              <div className="actions-section">
                <div className="action-card">
                  <h3>Create Task</h3>
                  <div className="task-form">
                    <input
                      type="text"
                      placeholder="Task description..."
                      value={newTask.description}
                      onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                      className="task-input"
                    />
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: parseInt(e.target.value)})}
                      className="priority-select"
                    >
                      <option value={1}>Low Priority</option>
                      <option value={3}>Medium Priority</option>
                      <option value={5}>High Priority</option>
                      <option value={7}>Critical Priority</option>
                    </select>
                    <button onClick={createTask} className="btn btn-secondary">
                      Create Task
                    </button>
                  </div>
                </div>

                <div className="action-card">
                  <h3>Consensus Decision</h3>
                  <button onClick={buildConsensus} className="btn btn-secondary">
                    Build Consensus
                  </button>
                </div>
              </div>
            </div>
          ) : selectedHive ? (
            <div className="loading-status">Loading hive mind status...</div>
          ) : (
            <div className="no-selection">
              <h2>Select a hive mind to view details</h2>
              <p>Choose from the list on the left or create a new hive mind to get started.</p>
            </div>
          )}
        </main>
      </div>

      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Create New Hive Mind</h2>
              <button onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Objective:</label>
                <textarea
                  placeholder="Describe the main objective for this hive mind..."
                  value={newHiveConfig.objective}
                  onChange={(e) => setNewHiveConfig({...newHiveConfig, objective: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Name (optional):</label>
                <input
                  type="text"
                  placeholder="Hive mind name..."
                  value={newHiveConfig.name}
                  onChange={(e) => setNewHiveConfig({...newHiveConfig, name: e.target.value})}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Queen Type:</label>
                  <select
                    value={newHiveConfig.queen_type}
                    onChange={(e) => setNewHiveConfig({...newHiveConfig, queen_type: e.target.value})}
                  >
                    <option value="strategic">Strategic</option>
                    <option value="tactical">Tactical</option>
                    <option value="adaptive">Adaptive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Max Workers:</label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={newHiveConfig.max_workers}
                    onChange={(e) => setNewHiveConfig({...newHiveConfig, max_workers: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Consensus Algorithm:</label>
                <select
                  value={newHiveConfig.consensus_algorithm}
                  onChange={(e) => setNewHiveConfig({...newHiveConfig, consensus_algorithm: e.target.value})}
                >
                  <option value="majority">Majority</option>
                  <option value="weighted">Weighted</option>
                  <option value="byzantine">Byzantine</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowCreateForm(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={createHiveMind} 
                className="btn btn-primary"
                disabled={!newHiveConfig.objective.trim() || loading}
              >
                {loading ? 'Creating...' : 'Create Hive Mind'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HiveMindDashboard;