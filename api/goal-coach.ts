import { z } from 'zod';
import {
  filterSuggestionToKnownGoals,
  parseGoalReachAiSuggestion,
} from '../src/lib/goalCoachSchema';
import type { GoalCoachRequestBody } from '../src/types/goalCoach';

const GOAL_COACH_MODEL = process.env.GOAL_COACH_MODEL ?? 'gemini-2.0-flash';
const MAX_GOALS = 20;

const requestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  locale: z.string().max(16).optional(),
  includeConstraints: z.boolean().optional(),
  includeCashFlow: z.boolean().optional(),
  goals: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(200),
        deadline: z.string(),
        budget: z.number().finite(),
        fundingNeed: z.number().finite(),
        constraint: z.string().max(400).optional(),
        plannerPriority: z.number().int().optional(),
        plannedStartDate: z.string().optional(),
        isMagicWand: z.boolean(),
        milestoneCount: z.number().int().nonnegative(),
        incompleteMilestones: z.number().int().nonnegative(),
        taskCostTotal: z.number().finite(),
      })
    )
    .max(MAX_GOALS),
  cashSummary: z.object({
    savings: z.number().finite(),
    monthlySurplus: z.number().finite(),
    monthlyIncome: z.number().finite().optional(),
    monthlyExpenses: z.number().finite().optional(),
  }),
  feasibility: z.number().min(0).max(100).optional(),
  conflicts: z
    .array(
      z.object({
        type: z.string(),
        goalIds: z.array(z.string()),
      })
    )
    .optional(),
  finGoal: z
    .object({
      targetAmount: z.number().positive(),
      endYear: z.number().int(),
    })
    .optional(),
});

const SYSTEM_PROMPT = `You are a financial goal coach inside Cash Flow CFO.
Output ONLY valid JSON matching this schema:
{
  "summary": string,
  "reorder"?: { "goalId": string, "newPriority": number }[],
  "deadlineShifts"?: { "goalId": string, "newDeadline": "YYYY-MM-DD", "reason": string }[],
  "budgetAdjustments"?: { "goalId": string, "newBudget": number, "reason": string }[],
  "newMilestones"?: { "goalId": string, "title": string, "targetDate": "YYYY-MM-DD" }[],
  "weeklyFocus"?: { "goalId": string, "taskOrMilestoneTitle": string }[]
}
Rules:
- Never invent goals; only reference provided goal ids.
- Prefer shifting lower-priority goals before recommending income changes.
- Respect constraints verbatim when present.
- Quantify trade-offs using the user's currency context from the payload.
- Keep summary under 800 characters.`;

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

function getApiKey(): string | undefined {
  return process.env.GOAL_COACH_API_KEY ?? process.env.GEMINI_API_KEY;
}

async function callGemini(userPrompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GOAL_COACH_API_KEY is not configured');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GOAL_COACH_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

function buildUserPrompt(body: GoalCoachRequestBody): string {
  return JSON.stringify(
    {
      locale: body.locale ?? 'en',
      userPrompt: body.prompt,
      feasibility: body.feasibility,
      cashSummary: body.cashSummary,
      finGoal: body.finGoal,
      conflicts: body.conflicts,
      goals: body.goals,
    },
    null,
    2
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).json(null);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!getApiKey()) {
    return res.status(503).json({
      error: 'AI Coach is not configured',
      code: 'coach_unavailable',
    });
  }

  const parsedBody = requestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      code: 'invalid_body',
    });
  }

  const body = parsedBody.data as GoalCoachRequestBody;

  try {
    const rawText = await callGemini(buildUserPrompt(body));
    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        error: 'Coach returned non-JSON response',
        code: 'invalid_model_json',
      });
    }

    const suggestion = parseGoalReachAiSuggestion(json);
    if (!suggestion) {
      return res.status(502).json({
        error: 'Coach response failed validation',
        code: 'invalid_suggestion',
      });
    }

    const goalIds = new Set(body.goals.map((g) => g.id));
    const filtered = filterSuggestionToKnownGoals(suggestion, goalIds);

    return res.status(200).json({
      suggestion: filtered,
      model: GOAL_COACH_MODEL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message, code: 'coach_error' });
  }
}