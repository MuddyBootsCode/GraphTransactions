// Time scaling utility for slider
export class TimeScale {
  constructor(transactions) {
    if (!transactions || transactions.length === 0) {
      this.startTime = 0;
      this.endTime = 100;
      this.range = 100;
      return;
    }
    
    // Extract timestamps and convert to Date objects
    const timestamps = transactions.map(tx => new Date(tx.timestamp).getTime());
    
    // Find min and max timestamps
    this.startTime = Math.min(...timestamps);
    this.endTime = Math.max(...timestamps);
    this.range = this.endTime - this.startTime;
    
    // Save full range information for filtering
    this.fullStartTime = this.startTime;
    this.fullEndTime = this.endTime;
    this.fullRange = this.range;
    
    // Build a sorted array of transaction indexes by timestamp
    this.sortedIndexes = transactions.map((tx, index) => ({
      index: index,
      time: new Date(tx.timestamp).getTime()
    })).sort((a, b) => a.time - b.time);
  }
  
  // Get all transactions within a time range
  getTransactionsInRange(transactions, minTime, maxTime) {
    if (!transactions || transactions.length === 0) return [];
    
    return transactions
      .map((tx, index) => ({
        index: index,
        time: new Date(tx.timestamp).getTime()
      }))
      .filter(item => item.time >= minTime && item.time <= maxTime)
      .map(item => item.index);
  }
  
  // Convert timestamp to slider value (0-100)
  timeToSlider(timestamp) {
    if (this.range === 0) return 0;
    const time = new Date(timestamp).getTime();
    return Math.round(((time - this.startTime) / this.range) * 100);
  }
  
  // Convert slider value to timestamp
  sliderToTimestamp(sliderValue) {
    if (sliderValue <= 0) return this.startTime;
    if (sliderValue >= 100) return this.endTime;
    
    return this.startTime + (sliderValue / 100) * this.range;
  }
  
  // Convert slider value to timestamp index
  sliderToIndex(sliderValue, transactions) {
    if (!transactions || transactions.length === 0) return 0;
    if (sliderValue <= 0) return 0;
    if (sliderValue >= 100) return transactions.length - 1;
    
    const targetTime = this.sliderToTimestamp(sliderValue);
    
    // Use the sorted indexes for more consistent navigation
    if (this.sortedIndexes) {
      // Binary search to find the closest timestamp
      let left = 0;
      let right = this.sortedIndexes.length - 1;
      
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const midTime = this.sortedIndexes[mid].time;
        
        if (midTime === targetTime) {
          return this.sortedIndexes[mid].index;
        }
        
        if (midTime < targetTime) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      
      // After binary search, left is the insertion point
      // Choose the closest index
      if (left === 0) {
        return this.sortedIndexes[0].index;
      }
      
      if (left >= this.sortedIndexes.length) {
        return this.sortedIndexes[this.sortedIndexes.length - 1].index;
      }
      
      const leftDiff = Math.abs(this.sortedIndexes[left - 1].time - targetTime);
      const rightDiff = Math.abs(this.sortedIndexes[left].time - targetTime);
      
      return leftDiff <= rightDiff 
        ? this.sortedIndexes[left - 1].index 
        : this.sortedIndexes[left].index;
    }
    
    // Fallback to linear search if sortedIndexes not available
    let closestIndex = 0;
    let closestDiff = Number.MAX_VALUE;
    
    transactions.forEach((tx, index) => {
      const txTime = new Date(tx.timestamp).getTime();
      const diff = Math.abs(txTime - targetTime);
      
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  }
  
  // Format timestamp for display
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Format timestamp with date for current time display
  formatCurrentTime(timestamp) {
    if (!timestamp) return "No time";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    });
  }
} 