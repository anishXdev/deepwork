#!/usr/bin/env node

/**
 * Deepwork Model Context Protocol (MCP) Server
 * Transport: stdio (JSON-RPC 2.0)
 * Allows AI assistants (Claude, Cursor, Antigravity, etc.) to view,
 * create, and manage tasks and focus sessions in Deepwork.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const STORE_PATH = path.join(__dirname, '..', 'deepwork-mcp-store.json');

// Helper to load store
function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
  return {
    boards: [
      { id: 'board_default', name: 'Tasks & Projects', isDefault: true, members: [{ id: 'me', name: 'You (Owner)' }] }
    ],
    tags: [
      { id: 'tag_1', name: 'features', color: '#0C66E4' },
      { id: 'tag_2', name: 'backend', color: '#10B981' }
    ],
    tasks: [],
    sessions: [],
    streak: { currentStreak: 3, longestStreak: 14 }
  };
}

function saveStore(store) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write store:', e);
  }
}

// Tool Definitions
const TOOLS = [
  {
    name: 'deepwork_list_tasks',
    description: 'Retrieve all tasks and cards from Deepwork with optional filters (status, tag, or boardId)',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['all', 'todo', 'completed'],
          description: 'Filter tasks by completion status'
        },
        tag: {
          type: 'string',
          description: 'Filter tasks matching a specific tag name (e.g. "backend", "interview")'
        },
        boardId: {
          type: 'string',
          description: 'Filter tasks by board ID'
        }
      }
    }
  },
  {
    name: 'deepwork_create_task',
    description: 'Create a new card/task in Deepwork. Automatically extracts #tags from the title, creates missing tags, and assigns deadline and focus duration.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title. Supports inline #tags (e.g. "Fix auth bug #backend #critical")'
        },
        approxHours: {
          type: 'number',
          description: 'Estimated focus hours (e.g. 0.5, 1.5, 2.0)'
        },
        deadlineDate: {
          type: 'string',
          description: 'Target deadline in YYYY-MM-DD format (defaults to today)'
        },
        priority: {
          type: 'string',
          enum: ['normal', 'high', 'urgent'],
          description: 'Task priority level'
        },
        notes: {
          type: 'string',
          description: 'Deliverables, acceptance criteria, or checklist notes'
        },
        boardId: {
          type: 'string',
          description: 'Target board ID (defaults to active board)'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'deepwork_update_task',
    description: 'Update an existing task in Deepwork (change status to completed, reschedule date, or edit notes)',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'The unique ID of the task to update'
        },
        status: {
          type: 'string',
          enum: ['todo', 'completed'],
          description: 'New completion status'
        },
        deadlineDate: {
          type: 'string',
          description: 'Reschedule to a new deadline date (YYYY-MM-DD)'
        },
        notes: {
          type: 'string',
          description: 'Updated notes or comments'
        }
      },
      required: ['taskId']
    }
  },
  {
    name: 'deepwork_list_boards',
    description: 'List all project and task boards in Deepwork along with their collaborators',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'deepwork_get_analytics',
    description: 'Get deep work productivity metrics: total focus hours logged, completed tasks count, active streak, and tag breakdown',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'deepwork_log_focus_session',
    description: 'Log completed focus time or Pomodoro session to Deepwork',
    inputSchema: {
      type: 'object',
      properties: {
        durationMinutes: {
          type: 'number',
          description: 'Number of focus minutes completed'
        },
        taskId: {
          type: 'string',
          description: 'Associated task ID'
        },
        mode: {
          type: 'string',
          enum: ['pomodoro', 'custom', 'short_break'],
          description: 'Focus timer mode'
        }
      },
      required: ['durationMinutes']
    }
  }
];

// Handle Tool Calls
function handleToolCall(name, args) {
  const store = loadStore();

  switch (name) {
    case 'deepwork_list_tasks': {
      let filtered = store.tasks || [];
      if (args.status && args.status !== 'all') {
        filtered = filtered.filter(t => t.status === args.status);
      }
      if (args.boardId) {
        filtered = filtered.filter(t => t.boardId === args.boardId);
      }
      if (args.tag) {
        const cleanTag = args.tag.toLowerCase().replace(/^#+/, '');
        filtered = filtered.filter(t => (t.tags || []).some(tid => {
          const tObj = store.tags.find(tag => tag.id === tid);
          return tObj && tObj.name.toLowerCase() === cleanTag;
        }) || (t.name && t.name.toLowerCase().includes(`#${cleanTag}`)));
      }

      const taskSummaries = filtered.map(t => {
        const tagNames = (t.tags || []).map(tid => {
          const found = store.tags.find(tag => tag.id === tid);
          return found ? `#${found.name}` : null;
        }).filter(Boolean);

        return {
          id: t.id,
          name: t.name,
          status: t.status,
          approxHours: t.approxHours || 1.5,
          scheduledDate: t.scheduledDate,
          priority: t.priority || 'normal',
          tags: tagNames,
          notes: t.notes || ''
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: `Found ${taskSummaries.length} task(s):\n\n` + JSON.stringify(taskSummaries, null, 2)
          }
        ]
      };
    }

    case 'deepwork_create_task': {
      const title = args.title || '';
      const tagMatches = (title.match(/#([a-zA-Z0-9_\-]+)/g) || []).map(m => m.slice(1).toLowerCase());
      const matchedTagIds = [];

      for (const tName of tagMatches) {
        let existing = store.tags.find(t => t.name.toLowerCase() === tName);
        if (!existing) {
          existing = {
            id: 'tag_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: tName,
            color: '#0C66E4',
            createdAt: new Date().toISOString()
          };
          store.tags.push(existing);
        }
        if (!matchedTagIds.includes(existing.id)) matchedTagIds.push(existing.id);
      }

      const cleanTitle = title.replace(/#([a-zA-Z0-9_\-]+)/g, '').trim() || title.trim();
      const today = new Date().toISOString().split('T')[0];

      const newTask = {
        id: 'top_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        boardId: args.boardId || store.boards[0]?.id || 'board_default',
        name: cleanTitle,
        tags: matchedTagIds,
        approxHours: Number(args.approxHours) || 1.5,
        scheduledDate: args.deadlineDate || today,
        scheduledTime: '10:00',
        status: 'todo',
        priority: args.priority || 'normal',
        notes: args.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      store.tasks = store.tasks || [];
      store.tasks.push(newTask);
      saveStore(store);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Created card "${cleanTitle}" [ID: ${newTask.id}] with tags: ${tagMatches.map(t => '#' + t).join(' ') || 'none'}`
          }
        ]
      };
    }

    case 'deepwork_update_task': {
      const task = (store.tasks || []).find(t => t.id === args.taskId);
      if (!task) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Task with ID ${args.taskId} not found.` }]
        };
      }

      if (args.status) task.status = args.status;
      if (args.deadlineDate) task.scheduledDate = args.deadlineDate;
      if (args.notes !== undefined) task.notes = args.notes;
      task.updatedAt = new Date().toISOString();

      saveStore(store);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Updated task "${task.name}" [ID: ${task.id}]. Status: ${task.status}, Deadline: ${task.scheduledDate}`
          }
        ]
      };
    }

    case 'deepwork_list_boards': {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(store.boards || [], null, 2)
          }
        ]
      };
    }

    case 'deepwork_get_analytics': {
      const tasks = store.tasks || [];
      const completed = tasks.filter(t => t.status === 'completed');
      const totalHours = tasks.reduce((sum, t) => sum + (t.approxHours || 1), 0);
      const completedHours = completed.reduce((sum, t) => sum + (t.approxHours || 1), 0);

      const metrics = {
        totalTasks: tasks.length,
        completedTasks: completed.length,
        completionRate: tasks.length > 0 ? `${Math.round((completed.length / tasks.length) * 100)}%` : '0%',
        estimatedHours: Math.round(totalHours * 10) / 10,
        completedHours: Math.round(completedHours * 10) / 10,
        activeStreakDays: store.streak?.currentStreak || 0,
        totalTags: (store.tags || []).length
      };

      return {
        content: [
          {
            type: 'text',
            text: `📊 Deepwork Analytics Overview:\n\n` + JSON.stringify(metrics, null, 2)
          }
        ]
      };
    }

    case 'deepwork_log_focus_session': {
      const session = {
        id: 'sess_' + Date.now(),
        durationMinutes: Number(args.durationMinutes) || 25,
        topicId: args.taskId,
        mode: args.mode || 'pomodoro',
        timestamp: new Date().toISOString()
      };
      store.sessions = store.sessions || [];
      store.sessions.push(session);
      saveStore(store);

      return {
        content: [
          {
            type: 'text',
            text: `🍅 Logged ${session.durationMinutes} minutes of focus time in Deepwork!`
          }
        ]
      };
    }

    default:
      return {
        isError: true,
        content: [{ type: 'text', text: `Unknown tool: ${name}` }]
      };
  }
}

// JSON-RPC Stdio Loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', line => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    const id = request.id;

    if (request.method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'deepwork-mcp',
            version: '1.0.0'
          }
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }

    if (request.method === 'notifications/initialized') {
      // client acknowledgment
      return;
    }

    if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS
        }
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }

    if (request.method === 'tools/call') {
      const { name, arguments: toolArgs } = request.params || {};
      const toolResult = handleToolCall(name, toolArgs || {});
      const response = {
        jsonrpc: '2.0',
        id,
        result: toolResult
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      return;
    }

    // Default error for unhandled methods
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${request.method}` }
    }) + '\n');

  } catch (err) {
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error: ' + err.message }
    }) + '\n');
  }
});

// Ensure initial store exists
loadStore();
