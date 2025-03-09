import { useState, useEffect } from 'react'
import './App.css'
import Garden from './components/Garden'
import Header from './components/Header'
import AsanaConnect from './components/AsanaConnect'
import tokenStorage from './services/tokenStorage'
import taskStorage from './services/taskStorage'

// Generate more interesting mock tasks data
const generateMockTasks = (count: number = 15) => {
  const taskTypes = ['Research', 'Design', 'Development', 'Testing', 'Deployment', 'Documentation', 'Meeting'];
  const tasks = [];
  
  for (let i = 1; i <= count; i++) {
    const today = new Date();
    const completedDate = new Date(today);
    completedDate.setDate(today.getDate() - Math.floor(Math.random() * 30)); // Random day in the past month
    
    tasks.push({
      id: `task-${i}`,
      name: `${taskTypes[i % taskTypes.length]} Task ${i}`,
      completed_at: completedDate.toISOString(),
      resource_type: 'task',
      completed: true
    });
  }
  
  return tasks;
};

// Helper to generate ISO date string for 30 days ago
const getThirtyDaysAgoISOString = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
};

// Helper to generate ISO date string for 1 year ago
const getOneYearAgoISOString = (): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString();
};

// Helper to check if cache needs refreshing (older than 5 minutes)
const isCacheStale = (timestamp: number): boolean => {
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  const now = Date.now();
  return now - timestamp > FIVE_MINUTES_MS;
};

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshing, setAutoRefreshing] = useState<boolean>(false);
  
  // Check for saved token and cached tasks on component mount - happens ONCE on app load
  useEffect(() => {
    const savedToken = tokenStorage.getToken();
    if (savedToken) {
      console.log("🔍 App found saved token, setting state");
      setToken(savedToken);
      
      // Check for cached tasks before fetching
      const cachedTasks = taskStorage.getTasks();
      if (cachedTasks.length > 0) {
        console.log("📦 Using cached tasks:", cachedTasks.length, "tasks");
        setTasks(cachedTasks);
        
        // Check if cache is stale (older than 5 minutes)
        const cacheTimestamp = taskStorage.getLastSyncTimestamp();
        if (cacheTimestamp && isCacheStale(cacheTimestamp)) {
          console.log("🕙 Cache is stale (older than 5 minutes), auto-refreshing...");
          setAutoRefreshing(true);
          // Auto-refresh with merge, not replace
          autoRefreshTasks(savedToken);
        } else {
          console.log("✅ Cache is fresh (less than 5 minutes old)");
          // Set loading to false since we're using cached data
          setLoading(false);
        }
      }
    } else {
      console.log("🔍 App found no saved token");
    }
  }, []);
  
  // When token changes, fetch tasks (only if we don't have cached tasks or if explicitly refreshing)
  useEffect(() => {
    if (token) {
      // Only fetch tasks if we don't have cached tasks or we're using the demo token
      if (tasks.length === 0 || token === 'demo') {
        console.log("🔄 Token changed and no cached tasks found, fetching tasks");
        fetchTasksForToken(token);
      } else {
        console.log("🔄 Token changed but using cached tasks");
      }
    } else {
      console.log("⚠️ Token state is null or empty");
    }
  }, [token]);
  
  // Function for automatic refresh that merges with existing tasks
  const autoRefreshTasks = async (accessToken: string) => {
    if (!accessToken) return;
    
    try {
      console.log("🔄 Auto-refreshing tasks...");
      
      // Get the last sync date for incremental update
      const lastSyncDate = taskStorage.getLastSyncDate();
      if (!lastSyncDate) {
        console.log("⚠️ No last sync date found, skipping auto-refresh");
        setAutoRefreshing(false);
        return;
      }
      
      // Get existing tasks to merge with
      const existingTasks = taskStorage.getTasks();
      console.log(`📋 Using ${existingTasks.length} existing tasks for merge base`);
      
      // Fetch only tasks completed since last sync
      const userData = await fetchUserData(accessToken);
      
      if (userData && userData.workspaces && userData.workspaces.length > 0) {
        const workspace = userData.workspaces[0].gid;
        const userId = userData.gid;
        
        // Fetch new tasks since last sync
        const newTasks = await fetchAssignedTasks(accessToken, workspace, userId, lastSyncDate);
        console.log(`🆕 Found ${newTasks.length} new tasks since last sync`);
        
        if (newTasks.length > 0) {
          // Create task map from existing tasks
          const taskMap = new Map();
          existingTasks.forEach(task => {
            const taskId = task.gid;
            if (taskId) {
              taskMap.set(taskId, task);
            }
          });
          
          // Add new tasks to map
          let newCount = 0;
          let updatedCount = 0;
          
          newTasks.forEach(task => {
            const taskId = task.gid;
            if (!taskId) return;
            
            if (taskMap.has(taskId)) {
              updatedCount++;
            } else {
              newCount++;
            }
            taskMap.set(taskId, task);
          });
          
          // Convert map back to array
          const mergedTasks = Array.from(taskMap.values());
          console.log(`🔀 Merged: ${existingTasks.length} existing + ${newTasks.length} new = ${mergedTasks.length} total tasks`);
          console.log(`📊 Added ${newCount} new tasks and updated ${updatedCount} existing tasks`);
          
          // Update state and storage
          setTasks(mergedTasks);
          taskStorage.saveTasks(mergedTasks);
          taskStorage.saveLastSyncDate(new Date().toISOString());
        } else {
          console.log("✅ No new tasks to add, keeping existing cache");
        }
      }
    } catch (error) {
      console.error("❌ Auto-refresh error:", error);
    } finally {
      setAutoRefreshing(false);
    }
  };
  
  // Helper function to fetch user data (extracted for reuse)
  const fetchUserData = async (accessToken: string) => {
    const userEndpoint = 'https://app.asana.com/api/1.0/users/me';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    };
    
    const userResponse = await fetch(userEndpoint, { headers });
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("❌ User API error response:", errorText);
      return null;
    }
    
    const userData = await userResponse.json();
    return userData.data;
  };
  
  // Function to fetch all historical tasks
  const fetchAllHistoricalTasks = () => {
    if (token) {
      console.log("📚 Fetching all historical tasks...");
      // Clear the cached tasks to start fresh
      taskStorage.clearTasks();
      // Use 1 year ago instead of last sync date
      fetchTasksWithLookback(token, getOneYearAgoISOString());
    }
  };
  
  // Enhanced function to fetch tasks with a specific lookback period
  const fetchTasksWithLookback = async (accessToken: string, lookbackDate: string) => {
    setLoading(true);
    setError(null);
    
    console.log("🔄 Fetching tasks with lookback date:", lookbackDate);
    
    // Demo mode - return mock data
    if (accessToken === 'demo') {
      console.log("🧪 Using demo mode with mock data");
      setTimeout(() => {
        const mockTasks = generateMockTasks(15); 
        console.log("✅ Generated mock tasks:", mockTasks.length, "tasks");
        setTasks(mockTasks);
        setLoading(false);
      }, 1000); // Simulate API delay
      return;
    }
    
    // Real Asana API implementation
    try {
      // First get the user data to identify the user's workspace
      const userEndpoint = 'https://app.asana.com/api/1.0/users/me';
      console.log("🔍 Fetching user data from:", userEndpoint);
      
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      };
      
      console.log("📤 Request headers:", JSON.stringify(headers, null, 2).replace(accessToken, "TOKEN_HIDDEN"));
      
      const userResponse = await fetch(userEndpoint, { headers });
      
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error("❌ User API error response:", errorText);
        throw new Error(`Asana API error: ${userResponse.status} - ${errorText}`);
      }
      
      const userData = await userResponse.json();
      console.log("✅ User data fetched successfully");
      
      // If we have a workspace, get completed tasks
      if (userData.data && userData.data.workspaces && userData.data.workspaces.length > 0) {
        const workspace = userData.data.workspaces[0].gid;
        const userId = userData.data.gid;
        console.log("📋 Using workspace:", workspace);
        console.log("👤 User ID:", userId);
        console.log("📅 Using completed_since date:", lookbackDate);
        
        try {
          // Fetch all tasks assigned to the current user (required by API)
          const allTasks = await fetchAssignedTasks(accessToken, workspace, userId, lookbackDate);
          
          if (allTasks.length > 0) {
            console.log("🎯 Found", allTasks.length, "completed tasks assigned to you");
            
            // Debug task IDs to verify they are unique
            const taskIds = new Set();
            allTasks.forEach(task => {
              if (taskIds.has(task.gid)) {
                console.warn(`⚠️ Duplicate task ID found: ${task.gid}`);
              }
              taskIds.add(task.gid);
            });
            console.log(`📊 Found ${taskIds.size} unique task IDs out of ${allTasks.length} tasks`);
            
            // Set and save tasks
            setTasks(allTasks);
            taskStorage.saveTasks(allTasks);
            
            // Save the current date as last sync date
            taskStorage.saveLastSyncDate(new Date().toISOString());
            
            console.log("🎉 Set and cached tasks successfully with real data");
          } else {
            console.log("⚠️ No completed tasks found");
            setTasks([]);
          }
          setLoading(false);
        } catch (error) {
          console.error("❌ Error fetching tasks:", error);
          setError("Failed to fetch tasks: " + error);
          setLoading(false);
        }
      } else {
        setError("No workspaces found in your Asana account");
        setLoading(false);
      }
    } catch (error) {
      console.error("❌ Error:", error);
      setError("Failed to connect to Asana: " + error);
      setLoading(false);
    }
  };
  
  const handleAsanaConnect = (newToken: string) => {
    // Clear any previous error messages
    setError(null);
    
    // Set the new token
    console.log("📝 Setting new token:", newToken === 'demo' ? 'Demo mode' : 'User token');
    setToken(newToken);
    
    // Save token to local storage (unless it's the demo token)
    if (newToken !== 'demo') {
      console.log("💾 Saving token to localStorage");
      tokenStorage.saveToken(newToken);
    }
    
    // Clear cached tasks when connecting with a new token
    taskStorage.clearTasks();
  };
  
  // Fetch assigned tasks as a fallback (with proper assignee parameter)
  const fetchAssignedTasks = async (accessToken: string, workspace: string, userId: string, completedSince: string): Promise<any[]> => {
    console.log("🔍 Fetching tasks assigned to current user...");
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    };
    
    // Using assignee=me and workspace together (required by API)
    // Increase limit to 100 tasks per request and implement pagination
    const tasksPerPage = 100;
    let allCompletedTasks: any[] = [];
    let offset: string | null = null;
    let hasMore = true;
    
    while (hasMore) {
      // Build URL with pagination parameters and completed_since date
      // Make sure to include gid in the opt_fields
      let tasksEndpoint = `https://app.asana.com/api/1.0/tasks?workspace=${workspace}&assignee=${userId}&completed_since=${completedSince}&limit=${tasksPerPage}&opt_fields=gid,name,completed,completed_at`;
      if (offset) {
        tasksEndpoint += `&offset=${offset}`;
      }
      
      console.log("🔍 Fetching page of assigned tasks from:", tasksEndpoint);
      
      const tasksResponse = await fetch(tasksEndpoint, { headers });
      
      if (!tasksResponse.ok) {
        const errorText = await tasksResponse.text();
        console.error("❌ Assigned tasks API error response:", errorText);
        break;
      }
      
      const tasksData = await tasksResponse.json();
      console.log("✅ Page of assigned tasks data fetched, found", tasksData.data.length, "tasks");
      
      // Debug first task to see structure
      if (tasksData.data.length > 0) {
        console.log("📋 Sample task structure:", JSON.stringify(tasksData.data[0]).substring(0, 200) + "...");
      }
      
      // Filter for completed tasks and add to our collection
      const completedTasks = tasksData.data.filter((task: any) => task.completed);
      
      // Verify all tasks have a gid
      const tasksWithoutGid = completedTasks.filter((task: any) => !task.gid);
      if (tasksWithoutGid.length > 0) {
        console.warn(`⚠️ Found ${tasksWithoutGid.length} tasks without gid`);
      }
      
      allCompletedTasks = [...allCompletedTasks, ...completedTasks];
      
      // Check if there are more pages
      if (tasksData.next_page && tasksData.next_page.offset) {
        offset = tasksData.next_page.offset;
        console.log("📄 More pages available, continuing with offset:", offset);
      } else {
        hasMore = false;
        console.log("🏁 No more pages available, finished fetching tasks");
      }
    }
    
    console.log("🌟 Total completed tasks fetched:", allCompletedTasks.length);
    return allCompletedTasks;
  };
  
  // Regular fetch that checks for incremental updates
  const fetchTasksForToken = async (accessToken: string) => {
    setLoading(true);
    setError(null);
    
    console.log("🔄 Starting to fetch tasks with token:", accessToken === 'demo' ? 'Demo mode' : 'User token');
    
    // Demo mode - return mock data
    if (accessToken === 'demo') {
      console.log("🧪 Using demo mode with mock data");
      setTimeout(() => {
        const mockTasks = generateMockTasks(15); 
        console.log("✅ Generated mock tasks:", mockTasks.length, "tasks");
        setTasks(mockTasks);
        setLoading(false);
      }, 1000); // Simulate API delay
      return;
    }
    
    // Get existing cached tasks
    const existingTasks = taskStorage.getTasks();
    console.log(`📋 Using ${existingTasks.length} existing cached tasks as a baseline`);
    
    // Create a map of existing tasks by ID for easy lookup/updates
    const taskMap = new Map();
    
    // Use gid as the task ID (Asana's unique identifier)
    existingTasks.forEach(task => {
      // Debug the task ID to ensure it exists
      const taskId = task.gid;
      if (!taskId) {
        console.warn("⚠️ Task missing gid:", task);
      } else {
        taskMap.set(taskId, task);
      }
    });
    
    console.log(`📊 Created task map with ${taskMap.size} entries`);
    
    // Real Asana API implementation
    try {
      // First get the user data to identify the user's workspace
      const userEndpoint = 'https://app.asana.com/api/1.0/users/me';
      console.log("🔍 Fetching user data from:", userEndpoint);
      
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      };
      
      console.log("📤 Request headers:", JSON.stringify(headers, null, 2).replace(accessToken, "TOKEN_HIDDEN"));
      
      const userResponse = await fetch(userEndpoint, { headers });
      
      console.log("📥 User API response status:", userResponse.status);
      console.log("📥 User API response status text:", userResponse.statusText);
      
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error("❌ User API error response:", errorText);
        throw new Error(`Asana API error: ${userResponse.status} - ${errorText}`);
      }
      
      const userData = await userResponse.json();
      console.log("✅ User data fetched successfully");
      
      // If we have a workspace, get completed tasks
      if (userData.data && userData.data.workspaces && userData.data.workspaces.length > 0) {
        const workspace = userData.data.workspaces[0].gid;
        const userId = userData.data.gid;
        console.log("📋 Using workspace:", workspace);
        console.log("👤 User ID:", userId);
        
        // Check if we have cached tasks and a last sync date
        const lastSyncDate = taskStorage.getLastSyncDate();
        
        // Generate proper ISO date string for 30 days ago or use last sync date
        const thirtyDaysAgo = getThirtyDaysAgoISOString();
        const completedSince = lastSyncDate || thirtyDaysAgo;
        console.log("📅 Using completed_since date:", completedSince);
        
        try {
          // Fetch all tasks assigned to the current user (required by API)
          const newCompletedTasks = await fetchAssignedTasks(accessToken, workspace, userId, completedSince);
          
          if (newCompletedTasks.length > 0) {
            console.log("🎯 Found", newCompletedTasks.length, "newly completed tasks assigned to you");
            
            // Debug task IDs to verify they are unique
            let newTaskCount = 0;
            let updatedTaskCount = 0;
            
            // Merge new tasks with existing tasks using gid as the key
            newCompletedTasks.forEach(task => {
              const taskId = task.gid;
              if (!taskId) {
                console.warn("⚠️ New task missing gid:", task);
                return;
              }
              
              if (taskMap.has(taskId)) {
                updatedTaskCount++;
              } else {
                newTaskCount++;
              }
              
              taskMap.set(taskId, task);
            });
            
            console.log(`📊 Added ${newTaskCount} new tasks and updated ${updatedTaskCount} existing tasks`);
            
            // Convert map back to array
            const mergedTasks = Array.from(taskMap.values());
            console.log("🔄 After merging, now have", mergedTasks.length, "total tasks");
            
            // Update cached tasks
            setTasks(mergedTasks);
            taskStorage.saveTasks(mergedTasks);
            
            // Save the current date as last sync date
            taskStorage.saveLastSyncDate(new Date().toISOString());
            
            console.log("🎉 Set and cached tasks successfully with real data");
            setLoading(false);
          } else {
            // If no new completed tasks are found, just use existing cached tasks
            console.log("ℹ️ No new completed tasks found since last sync");
            
            if (existingTasks.length > 0) {
              console.log("✅ Using existing", existingTasks.length, "cached tasks");
              setTasks(existingTasks);
              setLoading(false);
            } else {
              // Try with 'me' as assignee as a fallback
              console.log("⚠️ No cached tasks and no new tasks found, trying alternative approach");
              
              // Try with 'me' as assignee - also implement pagination here
              let allCompletedTasks: any[] = [];
              let offset: string | null = null;
              let hasMore = true;
              const tasksPerPage = 100;
              
              while (hasMore) {
                let tasksEndpoint = `https://app.asana.com/api/1.0/tasks?workspace=${workspace}&assignee=me&completed_since=${completedSince}&limit=${tasksPerPage}`;
                if (offset) {
                  tasksEndpoint += `&offset=${offset}`;
                }
                tasksEndpoint += `&opt_fields=name,completed,completed_at`;
                
                const tasksResponse = await fetch(tasksEndpoint, { headers });
                
                if (!tasksResponse.ok) {
                  const errorText = await tasksResponse.text();
                  console.error("❌ Tasks API error response:", errorText);
                  break;
                }
                
                const tasksData = await tasksResponse.json();
                // Filter for completed tasks and add to our collection
                const completedTasks = tasksData.data.filter((task: any) => task.completed);
                allCompletedTasks = [...allCompletedTasks, ...completedTasks];
                
                // Check if there are more pages
                if (tasksData.next_page && tasksData.next_page.offset) {
                  offset = tasksData.next_page.offset;
                } else {
                  hasMore = false;
                }
              }
              
              if (allCompletedTasks.length > 0) {
                console.log("🎯 Found", allCompletedTasks.length, "completed tasks with paginated approach");
                setTasks(allCompletedTasks);
                setLoading(false);
                return;
              }
              
              // If still no tasks, try one last approach - all tasks assigned to me without date filter
              hasMore = true;
              offset = null;
              allCompletedTasks = [];
              
              while (hasMore) {
                let allTasksEndpoint = `https://app.asana.com/api/1.0/tasks?workspace=${workspace}&assignee=me&limit=${tasksPerPage}`;
                if (offset) {
                  allTasksEndpoint += `&offset=${offset}`;
                }
                allTasksEndpoint += `&opt_fields=name,completed,completed_at`;
                
                const allAssignedTasks = await fetch(allTasksEndpoint, { headers });
                
                if (!allAssignedTasks.ok) {
                  break;
                }
                
                const allTasksData = await allAssignedTasks.json();
                const myCompletedTasks = allTasksData.data.filter((task: any) => task.completed);
                allCompletedTasks = [...allCompletedTasks, ...myCompletedTasks];
                
                // Check if there are more pages
                if (allTasksData.next_page && allTasksData.next_page.offset) {
                  offset = allTasksData.next_page.offset;
                } else {
                  hasMore = false;
                }
              }
              
              if (allCompletedTasks.length > 0) {
                console.log("🎯 Found", allCompletedTasks.length, "completed tasks with final paginated approach");
                setTasks(allCompletedTasks);
                setLoading(false);
                return;
              }
            }
          }
        } catch (apiError) {
          console.error("❌ Error with Asana tasks API:", apiError);
          console.log("⚠️ Using mock data due to tasks API error");
          setTasks(generateMockTasks(20));
        }
      } else {
        console.log("⚠️ No workspaces found in user data");
        throw new Error("No workspaces found in your Asana account. Please ensure you have access to at least one workspace.");
      }
    } catch (error) {
      console.error("❌ Error fetching from Asana API:", error);
      
      // Handle common errors more specifically
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("401")) {
        setError("Authentication failed: Your Asana token might be invalid or expired. Please get a new token.");
      } else if (errorMessage.includes("403")) {
        setError("Access denied: You don't have permission to access this Asana resource.");
      } else if (errorMessage.includes("429")) {
        setError("Rate limit exceeded: Too many requests to Asana. Please try again later.");
      } else if (errorMessage.includes("5")) {  // 500, 502, 503, etc.
        setError("Asana server error: The Asana service might be experiencing issues. Please try again later.");
      } else if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
        setError("Network error: Could not connect to Asana. Please check your internet connection.");
      } else if (errorMessage.includes("Timestamp must be in ISO-8601")) {
        setError("Date format error: We've fixed the date format issue. Please try again.");
      } else if (errorMessage.includes("Must specify exactly one of")) {
        setError("API requirement: We've updated the API query format. Please try again.");
      } else {
        setError(`Failed to fetch tasks from Asana: ${errorMessage}`);
      }
      
      // Log the failure but keep the token - don't clear it on errors
      console.log("⚠️ Using mock data due to error");
      setTasks(generateMockTasks(20));
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle disconnecting from Asana
  const handleDisconnect = () => {
    // Clear token from storage
    tokenStorage.clearToken();
    
    // Clear cached tasks
    taskStorage.clearTasks();
    
    // Clear state
    setToken(null);
    setTasks([]);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header 
        token={token} 
        onLogout={handleDisconnect}
        onFetchAllHistory={fetchAllHistoricalTasks}
      />
      
      <main className="flex-grow">
        {autoRefreshing && (
          <div className="bg-blue-50 py-1 px-4 text-sm text-blue-800 flex items-center justify-center">
            <span className="animate-spin mr-2">🔄</span> Auto-refreshing your garden...
          </div>
        )}
        {!token ? (
          <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
            <AsanaConnect onConnect={handleAsanaConnect} />
          </div>
        ) : (
          <div className="flex-grow relative h-[calc(100vh-4rem)]">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                <div className="ml-4 text-green-600">Loading your garden...</div>
              </div>
            ) : (
              <Garden tasks={tasks} />
            )}
            
            {error && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-lg">
                <div className="font-bold mb-1">Error</div>
                <p>{error}</p>
                <div className="mt-2 text-xs">
                  <p>If this error persists:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Check that your token begins with "1/"</li>
                    <li>Try generating a new token in Asana</li>
                    <li>Ensure you have completed tasks in Asana</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
