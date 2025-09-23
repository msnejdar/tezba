/**
 * Claude Flow Hive Mind Service
 * Frontend service for interacting with the Hive Mind API
 */

const API_BASE = process.env.REACT_APP_API_BASE || '/api';

class HiveService {
  constructor() {
    this.baseURL = API_BASE;
  }

  async makeRequest(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Initialize a new hive mind
   */
  async initializeHiveMind(config) {
    return await this.makeRequest('POST', '/hive-mind/init', config);
  }

  /**
   * Create a new task
   */
  async createTask(swarmId, description, priority = 5, metadata = {}) {
    return await this.makeRequest('POST', `/hive-mind/${swarmId}/task`, {
      description,
      priority,
      metadata
    });
  }

  /**
   * Build consensus for a decision
   */
  async buildConsensus(swarmId, topic, options) {
    return await this.makeRequest('POST', `/hive-mind/${swarmId}/consensus`, {
      topic,
      options
    });
  }

  /**
   * Get hive mind status
   */
  async getStatus(swarmId) {
    return await this.makeRequest('GET', `/hive-mind/${swarmId}/status`);
  }

  /**
   * List all active hive minds
   */
  async listHiveMinds() {
    return await this.makeRequest('GET', '/hive-mind/list');
  }

  /**
   * Health check
   */
  async healthCheck() {
    return await this.makeRequest('GET', '/health');
  }

  /**
   * Monitor hive mind status with periodic updates
   */
  async monitorHiveMind(swarmId, callback, interval = 2000) {
    const monitor = async () => {
      try {
        const status = await this.getStatus(swarmId);
        callback(status);
      } catch (error) {
        console.error('Failed to get hive mind status:', error);
        callback({ error: error.message });
      }
    };

    // Initial call
    await monitor();

    // Set up periodic monitoring
    const intervalId = setInterval(monitor, interval);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Batch create multiple tasks
   */
  async createTasks(swarmId, tasks) {
    const results = [];
    
    for (const task of tasks) {
      try {
        const result = await this.createTask(
          swarmId,
          task.description,
          task.priority || 5,
          task.metadata || {}
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to create task: ${task.description}`, error);
        results.push({ error: error.message, description: task.description });
      }
    }
    
    return results;
  }

  /**
   * Get hive mind analytics
   */
  async getAnalytics(swarmId) {
    const status = await this.getStatus(swarmId);
    
    return {
      efficiency: this.calculateEfficiency(status),
      throughput: this.calculateThroughput(status),
      workerUtilization: this.calculateWorkerUtilization(status),
      taskDistribution: this.calculateTaskDistribution(status)
    };
  }

  calculateEfficiency(status) {
    const { tasks } = status;
    if (tasks.total === 0) return 0;
    
    return Math.round((tasks.completed / tasks.total) * 100);
  }

  calculateThroughput(status) {
    const { metrics } = status;
    if (!metrics) return 0;
    
    // Simplified throughput calculation
    return metrics.tasks_completed || 0;
  }

  calculateWorkerUtilization(status) {
    const { workers } = status;
    if (workers.length === 0) return 0;
    
    const busyWorkers = workers.filter(w => w.status === 'busy').length;
    return Math.round((busyWorkers / workers.length) * 100);
  }

  calculateTaskDistribution(status) {
    const { tasks } = status;
    
    return {
      pending: tasks.pending || 0,
      inProgress: tasks.in_progress || 0,
      completed: tasks.completed || 0,
      failed: tasks.failed || 0
    };
  }
}

// Create singleton instance
const hiveService = new HiveService();

export default hiveService;

// Export for testing
export { HiveService };