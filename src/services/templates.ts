import { Tag, Task, GateTaskCategory } from '../types';

export interface DeepworkTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: Array<{ name: string; color: string; icon: string }>;
  tasks: Array<{
    name: string;
    approxHours: number;
    status: 'todo' | 'completed';
    category?: GateTaskCategory;
    notes?: string;
  }>;
}

export const STARTER_TEMPLATES: DeepworkTemplate[] = [
  {
    id: 'hackathon',
    name: 'Hackathon 48h Sprint',
    description: 'Rapid product execution, architecture, MVP development, and pitch deck roadmap',
    icon: '🚀',
    tags: [
      { name: 'architecture', color: '#0C66E4', icon: '📐' },
      { name: 'mvp', color: '#8B5CF6', icon: '🚀' },
      { name: 'frontend', color: '#06B6D4', icon: '🎨' },
      { name: 'backend', color: '#10B981', icon: '⚙️' },
      { name: 'pitch-deck', color: '#F59E0B', icon: '🎤' }
    ],
    tasks: [
      { name: 'Design system architecture & DB schema #architecture', approxHours: 2.0, status: 'todo', notes: 'Outline table schemas, foreign keys, and API contracts' },
      { name: 'Scaffold repo & authentication flow #backend', approxHours: 2.5, status: 'todo', notes: 'Set up JWT / OAuth sessions and secure endpoint middleware' },
      { name: 'Build core interactive MVP user flow #frontend', approxHours: 3.0, status: 'todo', notes: 'Implement main views with responsive tactile UI' },
      { name: 'End-to-end user testing & polish #mvp', approxHours: 1.5, status: 'todo', notes: 'Fix edge-case bugs, test error states and loading spinners' },
      { name: 'Craft demo slides & 3-min pitch script #pitch-deck', approxHours: 2.0, status: 'todo', notes: 'Structure: Problem, Solution, Live Demo, Tech Stack, Vision' }
    ]
  },
  {
    id: 'internship',
    name: 'Internship & Career Hunt',
    description: 'Resume optimization, DSA coding practice, portfolio updates, and interview prep',
    icon: '💼',
    tags: [
      { name: 'resume', color: '#F59E0B', icon: '📄' },
      { name: 'dsa-prep', color: '#EF4444', icon: '💻' },
      { name: 'projects', color: '#10B981', icon: '🛠️' },
      { name: 'interviews', color: '#8B5CF6', icon: '🎯' },
      { name: 'networking', color: '#0C66E4', icon: '🤝' }
    ],
    tasks: [
      { name: 'Refine resume with STAR metrics & impact statements #resume', approxHours: 1.5, status: 'todo', notes: 'Highlight performance gains, latency reductions, and team results' },
      { name: 'Solve 3 medium Graph & Dynamic Programming problems #dsa-prep', approxHours: 2.0, status: 'todo', notes: 'Analyze time/space complexity and edge cases' },
      { name: 'Deploy portfolio flagship project with live demo link #projects', approxHours: 2.5, status: 'todo', notes: 'Write comprehensive README with architecture diagram' },
      { name: 'System design & behavioral mock interview practice #interviews', approxHours: 2.0, status: 'todo', notes: 'Prepare answers for leadership, conflict resolution, and trade-offs' },
      { name: 'Send 5 tailored applications and connect with recruiters #networking', approxHours: 1.0, status: 'todo', notes: 'Personalize outreach messages with genuine project interest' }
    ]
  },
  {
    id: 'engineering',
    name: 'Engineering Project Management',
    description: 'Feature development, CI/CD pipeline, API specifications, and code reviews',
    icon: '⚡',
    tags: [
      { name: 'features', color: '#0C66E4', icon: '✨' },
      { name: 'infrastructure', color: '#10B981', icon: '☁️' },
      { name: 'testing', color: '#8B5CF6', icon: '🧪' },
      { name: 'docs', color: '#64748B', icon: '📚' }
    ],
    tasks: [
      { name: 'Implement OpenAPI spec & contract validation #features', approxHours: 2.0, status: 'todo' },
      { name: 'Set up automated CI/CD build and test pipeline #infrastructure', approxHours: 2.5, status: 'todo' },
      { name: 'Write end-to-end integration test suite #testing', approxHours: 1.5, status: 'todo' },
      { name: 'Complete developer documentation and runbook #docs', approxHours: 1.0, status: 'todo' }
    ]
  },
  {
    id: 'deepstudy',
    name: 'Deep Study & Focus',
    description: 'Concept mastering, active recall problem solving, and spaced repetition',
    icon: '🧠',
    tags: [
      { name: 'core-theory', color: '#0C66E4', icon: '📖' },
      { name: 'problem-drill', color: '#EF4444', icon: '⚡' },
      { name: 'mock-test', color: '#8B5CF6', icon: '📝' },
      { name: 'revision', color: '#10B981', icon: '🔄' }
    ],
    tasks: [
      { name: 'Deep-dive lecture notes & synthesize core equations #core-theory', approxHours: 2.0, status: 'todo' },
      { name: 'Solve 15 timed practice problems without reference notes #problem-drill', approxHours: 2.5, status: 'todo' },
      { name: 'Full-length simulated test under exam conditions #mock-test', approxHours: 3.0, status: 'todo' },
      { name: 'Spaced repetition revision and error log update #revision', approxHours: 1.5, status: 'todo' }
    ]
  }
];

export const TemplateService = {
  getTemplates(): DeepworkTemplate[] {
    return STARTER_TEMPLATES;
  },

  getTemplateById(id: string): DeepworkTemplate | undefined {
    return STARTER_TEMPLATES.find(t => t.id === id);
  },

  downloadTemplateAsJson(templateId?: string) {
    let payload: any;
    let fileName = 'deepwork-template.json';

    if (templateId) {
      const template = this.getTemplateById(templateId);
      if (template) {
        payload = {
          format: 'deepwork-template',
          version: '1.0.0',
          template: {
            id: template.id,
            name: template.name,
            description: template.description,
            icon: template.icon,
            tags: template.tags,
            tasks: template.tasks
          }
        };
        fileName = `deepwork-${template.id}-template.json`;
      }
    }

    if (!payload) {
      // Clean blank template
      payload = {
        format: 'deepwork-template',
        version: '1.0.0',
        template: {
          id: 'blank',
          name: 'Blank Slate Template',
          description: 'A clean, blank deepwork board ready for custom tags and tasks',
          icon: '✨',
          tags: [],
          tasks: []
        },
        availableStarterTemplates: STARTER_TEMPLATES
      };
      fileName = 'deepwork-blank-template.json';
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', fileName);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  }
};
