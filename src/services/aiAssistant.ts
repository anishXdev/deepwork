// dstudy AI Assistant & Jev Decision Service
import { Subject, Topic, StudySession, StreakData, AppSettings } from '../types';

export interface AIContext {
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  streaks: StreakData;
  settings: AppSettings;
  hoursStudiedToday: number;
  hoursStudiedWeek: number;
}

export interface ParsedAIAction {
  type: 'ADD_TOPIC' | 'CREATE_SUBJECT' | 'START_TIMER' | 'COMPLETE_TOPIC' | 'ENABLE_STRICT_FOCUS' | 'NONE';
  payload?: any;
}

export interface AIResponse {
  text: string;
  action?: ParsedAIAction;
  source: 'gemini' | 'jev-local';
}

const STORAGE_KEY = 'dstudy_gemini_key';

export class AIAssistantService {
  static getApiKey(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(STORAGE_KEY) || ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || '';
  }

  static setApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  static hasApiKey(): boolean {
    return Boolean(this.getApiKey());
  }

  /**
   * Test an API key against Google Gemini 2.0 Flash
   */
  static async testApiKey(key: string): Promise<{ success: boolean; message: string }> {
    const trimmed = key.trim();
    if (!trimmed) {
      return { success: false, message: 'Please enter an API key.' };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with "OK"' }] }]
        })
      });

      if (res.ok) {
        return { success: true, message: 'Verified! Gemini 3.8 Flash is ready.' };
      }

      const errData = await res.json().catch(() => null);
      const errMsg = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
      return { success: false, message: errMsg };
    } catch (e: any) {
      return { success: false, message: e.message || 'Network connection failed.' };
    }
  }

  /**
   * Generates a conversational, human-sounding response using Gemini 2.0 / 1.5 Flash
   * with structured decision and action execution (Jev protocol).
   */
  static async chat(
    userPrompt: string,
    history: Array<{ role: 'user' | 'assistant'; text: string }>,
    context: AIContext
  ): Promise<AIResponse> {
    const apiKey = this.getApiKey();
    const systemInstruction = this.buildSystemPrompt(context);

    // If an API key is available, call Gemini directly
    if (apiKey) {
      try {
        const geminiResult = await this.callGeminiDirect(userPrompt, history, systemInstruction, apiKey);
        if (geminiResult) {
          const { cleanText, action } = this.extractAction(geminiResult);
          return {
            text: cleanText,
            action,
            source: 'gemini'
          };
        }
      } catch (err: any) {
        console.error('Direct Gemini call failed:', err);
        return {
          text: `⚠️ **Gemini API Error:** ${err.message || 'Could not reach Google Gemini'}.\n\nPlease ensure your key from [Google AI Studio](https://aistudio.google.com/app/apikey) is valid and has Gemini API enabled.`,
          source: 'gemini'
        };
      }
    }

    // Try server proxy /api/ai if deployed or running with backend
    try {
      const serverResult = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          systemInstruction,
          history: history.slice(-6),
          apiKey
        })
      });

      if (serverResult.ok) {
        const data = await serverResult.json();
        if (data.reply) {
          const { cleanText, action } = this.extractAction(data.reply);
          return {
            text: cleanText,
            action,
            source: 'gemini'
          };
        }
      }
    } catch {
      // Backend proxy not reachable
    }

    // Local Jev Structured Decision Engine (Instant offline scheduling & advice)
    return this.runLocalJevEngine(userPrompt, context);
  }

  private static buildSystemPrompt(ctx: AIContext): string {
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const subjectList = ctx.subjects.map(s => `"${s.name}" (ID: ${s.id}, ${s.weeklyTargetHours || 6}h/wk target)`).join(', ');
    const pendingTopics = ctx.topics.filter(t => t.status !== 'completed').map(t => `"${t.name}" (${t.approxHours}h, date: ${t.scheduledDate})`).slice(0, 10).join(', ');

    return `You are dstudy AI (also known as Jev), a brilliant, empathetic, witty, and deeply encouraging personal study co-pilot inside the dstudy app.
You speak naturally like a supportive mentor and thoughtful peer who understands deep work, flow state, cognitive science, and student life.
You NEVER sound robotic, and you avoid canned corporate filler phrases. Keep your answers concise, thoughtful, and immediately actionable.

Current user context:
- App Name: dstudy
- Today's date: ${today} (${dayOfWeek})
- User streak: ${ctx.streaks.currentStreak} consecutive days (All-time best: ${ctx.streaks.longestStreak} days)
- Hours studied today: ${ctx.hoursStudiedToday}h
- Hours studied this week: ${ctx.hoursStudiedWeek}h of ${ctx.settings.weeklyHoursTarget}h weekly goal
- Current subjects: [${subjectList}]
- Active topics in queue: [${pendingTopics || 'None yet'}]

Capability:
You can answer ANY question the user asks: academic queries, mathematical proofs, code debugging, essay framing, memory techniques (spaced repetition, Feynman, active recall), motivation, or scheduling.

Tool / Action Calling:
If the user wants you to take an action in their study app, you MUST include a single structured action tag at the very end of your reply:
1. To add a topic/task:
<!--ACTION:{"type":"ADD_TOPIC","payload":{"name":"Topic Title","subjectName":"Subject Name","approxHours":1.5,"date":"${today}","time":"10:00"}}-->
2. To create a new subject:
<!--ACTION:{"type":"CREATE_SUBJECT","payload":{"name":"Subject Name","weeklyHours":6}}-->
3. To start a focus session:
<!--ACTION:{"type":"START_TIMER","payload":{"topicName":"Optional Topic Name"}}-->
4. To mark a topic as finished:
<!--ACTION:{"type":"COMPLETE_TOPIC","payload":{"topicName":"Topic Name"}}-->
5. To activate strict focus lockdown:
<!--ACTION:{"type":"ENABLE_STRICT_FOCUS","payload":{}}-->

Always wrap your main response in natural markdown, and place the <!--ACTION:...--> tag at the very end if an action was requested.`;
  }

  private static async callGeminiDirect(
    prompt: string,
    history: Array<{ role: 'user' | 'assistant'; text: string }>,
    systemInstruction: string,
    apiKey: string
  ): Promise<string> {
    // 1. Build conversation turns strictly alternating 'user' and 'model', starting with 'user'
    const turns: Array<{ role: 'user' | 'model'; text: string }> = [];

    // Filter history
    const recent = history.slice(-8);
    for (const h of recent) {
      const role: 'user' | 'model' = h.role === 'assistant' ? 'model' : 'user';
      // Gemini API rule: First item MUST be role 'user'
      if (turns.length === 0 && role === 'model') continue;
      // Gemini API rule: Cannot have two consecutive identical roles
      if (turns.length > 0 && turns[turns.length - 1].role === role) continue;
      turns.push({ role, text: h.text });
    }

    // Append the current prompt
    if (turns.length > 0 && turns[turns.length - 1].role === 'user') {
      turns[turns.length - 1].text += `\n\n${prompt}`;
    } else {
      turns.push({ role: 'user', text: prompt });
    }

    // Inject system instructions into the first user message for 100% universal API compatibility
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    for (let i = 0; i < turns.length; i++) {
      let turnText = turns[i].text;
      if (i === 0) {
        turnText = `[System Instructions & Context for dstudy AI]:\n${systemInstruction}\n\n[User Query]:\n${turnText}`;
      }
      contents.push({
        role: turns[i].role,
        parts: [{ text: turnText }]
      });
    }

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 1200
      }
    };

    // Try current models: gemini-3.8-flash -> gemini-3.5-flash -> gemini-3.7-flash -> gemini-3.5-flash-lite
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite'];
    let lastErrorMessage = '';

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return reply;
        } else {
          const errData = await res.json().catch(() => null);
          const msg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          lastErrorMessage = msg;
          console.warn(`Model ${model} failed:`, msg);

          // If key is outright invalid, don't bother trying other models
          if (res.status === 400 && (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid'))) {
            throw new Error('API key is not valid. Please re-copy your key from Google AI Studio.');
          }
        }
      } catch (err: any) {
        if (err.message?.includes('API key is not valid')) throw err;
        lastErrorMessage = err.message || 'Network error';
      }
    }

    throw new Error(lastErrorMessage || 'Failed to receive reply from Google Gemini API.');
  }

  private static extractAction(rawText: string): { cleanText: string; action?: ParsedAIAction } {
    const actionMatch = rawText.match(/<!--ACTION:([\s\S]*?)-->/);
    if (!actionMatch) {
      return { cleanText: rawText.trim() };
    }

    try {
      const parsed = JSON.parse(actionMatch[1].trim());
      const cleanText = rawText.replace(actionMatch[0], '').trim();
      return {
        cleanText,
        action: parsed as ParsedAIAction
      };
    } catch (err) {
      console.warn('Failed to parse AI action payload:', err);
      return { cleanText: rawText.trim() };
    }
  }

  /**
   * Local Jev Engine: Provides instant structured intent decisions and conversational fallbacks
   * when an API key is not yet set or during offline mode.
   */
  private static runLocalJevEngine(text: string, ctx: AIContext): AIResponse {
    const lower = text.toLowerCase().trim();

    // 1. ADD TOPIC
    if (
      lower.startsWith('add topic') ||
      lower.startsWith('create topic') ||
      lower.startsWith('add task') ||
      lower.includes('add topic') ||
      (lower.includes('topic') && (lower.includes('for') || lower.includes('in')))
    ) {
      let hours = 1.5;
      const hourMatch = text.match(/(\d+(\.\d+)?)\s*(hours?|hrs?|h)\b/i);
      const minMatch = text.match(/(\d+)\s*(mins?|minutes?)\b/i);
      if (hourMatch) hours = parseFloat(hourMatch[1]);
      else if (minMatch) hours = Math.round((parseInt(minMatch[1], 10) / 60) * 10) / 10;

      let scheduledDate = new Date().toISOString().split('T')[0];
      if (lower.includes('tomorrow')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        scheduledDate = d.toISOString().split('T')[0];
      }

      let matchedSubject = ctx.subjects[0]?.name || 'General';
      for (const s of ctx.subjects) {
        if (lower.includes(s.name.toLowerCase())) {
          matchedSubject = s.name;
          break;
        }
      }

      let topicName = '';
      const quoteMatch = text.match(/['"]([^'"]+)['"]/);
      if (quoteMatch) {
        topicName = quoteMatch[1].trim();
      } else {
        topicName = text
          .replace(/add\s+(topic|task)\s+/i, '')
          .replace(/create\s+(topic|task)\s+/i, '')
          .replace(/(\d+(\.\d+)?)\s*(hours?|hrs?|h|mins?|minutes?)\b/gi, '')
          .replace(/\b(for|in|to|under|at|on|tomorrow|today)\b/gi, '')
          .replace(new RegExp(`\\b${matchedSubject}\\b`, 'gi'), '')
          .replace(/\s+/g, ' ')
          .trim() || 'New Study Module';
      }

      return {
        text: `Got it! I've scheduled **${topicName}** (${hours}h) under **${matchedSubject}** for ${scheduledDate === new Date().toISOString().split('T')[0] ? 'today' : 'tomorrow'}. Let me know whenever you want to begin a focus session for it!`,
        action: {
          type: 'ADD_TOPIC',
          payload: {
            name: topicName,
            subjectName: matchedSubject,
            approxHours: hours,
            date: scheduledDate,
            time: '10:00'
          }
        },
        source: 'jev-local'
      };
    }

    // 2. CREATE SUBJECT
    if (lower.startsWith('create subject') || lower.startsWith('add subject') || lower.startsWith('new subject')) {
      let weeklyHours = 6;
      const hoursMatch = text.match(/(\d+(\.\d+)?)\s*(hours?|hrs?|h)\b/i);
      if (hoursMatch) weeklyHours = parseFloat(hoursMatch[1]);

      let name = '';
      const quoteMatch = text.match(/['"]([^'"]+)['"]/);
      if (quoteMatch) {
        name = quoteMatch[1].trim();
      } else {
        name = text
          .replace(/create\s+subject\s+/i, '')
          .replace(/add\s+subject\s+/i, '')
          .replace(/new\s+subject\s+/i, '')
          .replace(/(\d+(\.\d+)?)\s*(hours?|hrs?|h)\b/gi, '')
          .replace(/\b(with|target|weekly|hours?|per\s+week)\b/gi, '')
          .trim() || 'New Subject';
      }

      return {
        text: `Curriculum domain **${name}** has been created with a **${weeklyHours}h weekly target**. You can now attach targeted topics and track your mastery.`,
        action: {
          type: 'CREATE_SUBJECT',
          payload: { name, weeklyHours }
        },
        source: 'jev-local'
      };
    }

    // 3. START TIMER / STRICT FOCUS
    if (lower.includes('strict focus') || lower.includes('lockdown')) {
      return {
        text: `Entering **Strict Focus Lockdown**! Your screen will stay locked in immersion mode until the session completes. Distractions are blocked.`,
        action: {
          type: 'ENABLE_STRICT_FOCUS',
          payload: {}
        },
        source: 'jev-local'
      };
    }

    if (lower.startsWith('start timer') || lower.startsWith('launch timer') || lower.startsWith('focus on') || lower.includes('pomodoro for')) {
      let topicName = '';
      for (const t of ctx.topics) {
        if (lower.includes(t.name.toLowerCase())) {
          topicName = t.name;
          break;
        }
      }

      return {
        text: `Starting your Focus session${topicName ? ` for **${topicName}**` : ''}. Time to tune out the world and drop into deep flow.`,
        action: {
          type: 'START_TIMER',
          payload: { topicName }
        },
        source: 'jev-local'
      };
    }

    // 4. COMPLETE TOPIC
    if (lower.startsWith('mark done') || lower.startsWith('mark complete') || lower.startsWith('finish topic')) {
      let topicName = '';
      for (const t of ctx.topics) {
        if (lower.includes(t.name.toLowerCase())) {
          topicName = t.name;
          break;
        }
      }

      return {
        text: `Nice work! Marked **${topicName || 'topic'}** as completed. Consistency is the compound interest of learning.`,
        action: {
          type: 'COMPLETE_TOPIC',
          payload: { topicName }
        },
        source: 'jev-local'
      };
    }

    // 5. QUERY STATS / STREAK
    if (lower.includes('streak') || lower.includes('hours') || lower.includes('progress') || lower.includes('stats') || lower.includes('today')) {
      const today = ctx.hoursStudiedToday;
      const week = ctx.hoursStudiedWeek;
      const target = ctx.settings.weeklyHoursTarget;
      const percent = Math.min(100, Math.round((week / target) * 100));

      return {
        text: `Here is your current pulse:\n\n• **Today:** ${today}h logged\n• **This Week:** ${week}h / ${target}h (${percent}%)\n• **Current Streak:** 🔥 ${ctx.streaks.currentStreak} consecutive days (Best: 🏆 ${ctx.streaks.longestStreak}d)\n\n${percent >= 100 ? "You've hit your weekly target! Keep pushing the envelope." : "Solid progress — another focused session will get you even closer."}`,
        source: 'jev-local'
      };
    }

    // 6. GENERAL CONVERSATION
    return {
      text: `I'm here with you! To answer complex academic questions, explain intricate code/math concepts in depth, or break down any topic from scratch, connect your free **Gemini API key** in the key icon above (takes 5 seconds from Google AI Studio).\n\nIn the meantime, you can ask me to **schedule topics**, **create subjects**, **launch focus sessions**, or **activate strict lockdown** anytime!`,
      source: 'jev-local'
    };
  }
}
