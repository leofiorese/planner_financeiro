"use client";

import React, { useState, useEffect } from "react";
import { useFinancialState } from "@/context";
import { useLanguage } from "@/context/LanguageContext";
import { Frequency } from "@/types";
import { aiAnalysisService } from "@/services/ai/aiAnalysisService";
import type {
  AIAnalysisResult,
  AIServiceStatus,
} from "@/services/ai/aiAnalysisService";

interface AskAIButtonProps {
  className?: string;
}

// Configuration for AI mode
const AI_CONFIG = {
  // Control which mode to show: 'api' for LLM API calls, 'prompt' for copy-paste prompts
  mode: (process.env.NEXT_PUBLIC_AI_MODE as "api" | "prompt") || "prompt",

  // Whether to show API mode at all (for future rollout)
  enableApiMode: process.env.NEXT_PUBLIC_ENABLE_API_MODE === "true",
};

export default function AskAIButton({ className = "" }: AskAIButtonProps) {
  const { t } = useLanguage();
  const state = useFinancialState();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState("");
  const [serviceStatus, setServiceStatus] = useState<AIServiceStatus | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"custom" | "quick">("quick");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Quick analysis options
  const quickOptions = [
    {
      id: "overview",
      title: t("ai.quick.overview.title"),
      description: t("ai.quick.overview.desc"),
      icon: "📊",
    },
    {
      id: "savings",
      title: t("ai.quick.savings.title"),
      description: t("ai.quick.savings.desc"),
      icon: "💰",
    },
    {
      id: "expenses",
      title: t("ai.quick.expenses.title"),
      description: t("ai.quick.expenses.desc"),
      icon: "💸",
    },
    {
      id: "goals",
      title: t("ai.quick.goals.title"),
      description: t("ai.quick.goals.desc"),
      icon: "🎯",
    },
    {
      id: "budget",
      title: t("ai.quick.budget.title"),
      description: t("ai.quick.budget.desc"),
      icon: "📋",
    },
    {
      id: "investment",
      title: t("ai.quick.investment.title"),
      description: t("ai.quick.investment.desc"),
      icon: "📈",
    },
  ];

  // Load service status on mount (only in API mode)
  useEffect(() => {
    if (AI_CONFIG.mode === "api" && AI_CONFIG.enableApiMode) {
      loadServiceStatus();
    }
  }, []);

  // Subscribe to loading state changes (only in API mode)
  useEffect(() => {
    if (AI_CONFIG.mode === "api" && AI_CONFIG.enableApiMode) {
      const unsubscribe = aiAnalysisService.onLoadingChange(setIsLoading);
      return unsubscribe;
    }
  }, []);

  const loadServiceStatus = async () => {
    const status = await aiAnalysisService.getServiceStatus();
    setServiceStatus(status);
    if (status?.defaultModel) {
      setSelectedModel(status.defaultModel);
    }
  };

  // Generate financial data summary for prompts
  const generateFinancialSummary = () => {
    if (!state.userPlan) return "";

    const activeIncome = state.userPlan.income.filter((i) => i.isActive);
    const activeExpenses = state.userPlan.expenses.filter((e) => e.isActive);
    const activeGoals = state.userPlan.goals.filter((g) => g.isActive);

    const totalMonthlyIncome = activeIncome.reduce((sum, income) => {
      const multiplier =
        income.frequency === Frequency.MONTHLY
          ? 1
          : income.frequency === Frequency.YEARLY
            ? 1 / 12
            : income.frequency === Frequency.WEEKLY
              ? 4.33
              : 1;
      return sum + income.amount * multiplier;
    }, 0);

    const totalMonthlyExpenses = activeExpenses.reduce((sum, expense) => {
      if (!expense.recurring) return sum;
      const multiplier =
        expense.frequency === Frequency.MONTHLY
          ? 1
          : expense.frequency === Frequency.YEARLY
            ? 1 / 12
            : expense.frequency === Frequency.WEEKLY
              ? 4.33
              : 1;
      return sum + expense.amount * multiplier;
    }, 0);

    return `
FINANCIAL OVERVIEW:
- Current Balance: $${state.userPlan.currentBalance.toLocaleString()}
- Monthly Income: $${totalMonthlyIncome.toLocaleString()} (from ${activeIncome.length
      } sources)
- Monthly Expenses: $${totalMonthlyExpenses.toLocaleString()} (from ${activeExpenses.length
      } categories)
- Net Monthly: $${(totalMonthlyIncome - totalMonthlyExpenses).toLocaleString()}
- Active Goals: ${activeGoals.length} goals

INCOME SOURCES:
${activeIncome
        .map(
          (income) =>
            `- ${income.name}: $${income.amount.toLocaleString()} (${income.frequency
            })`
        )
        .join("\n")}

EXPENSE CATEGORIES:
${activeExpenses
        .slice(0, 10)
        .map(
          (expense) =>
            `- ${expense.name}: $${expense.amount.toLocaleString()} (${expense.category
            })`
        )
        .join("\n")}

FINANCIAL GOALS:
${activeGoals
        .map((goal) => {
          const progress = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(
            1
          );
          return `- ${goal.name
            }: $${goal.currentAmount.toLocaleString()} / $${goal.targetAmount.toLocaleString()} (${progress}% complete)`;
        })
        .join("\n")}
    `.trim();
  };

  // Generate specific analysis prompts using advanced prompt engineering techniques
  const generateAnalysisPrompt = (analysisType: string) => {
    const financialData = generateFinancialSummary();

    const prompts = {
      overview: `# FINANCIAL HEALTH ANALYSIS REQUEST

You are a certified financial planner with 15+ years of international experience. Analyze the financial data below using universal financial planning frameworks and provide actionable insights applicable to any country's financial system.

## FINANCIAL DATA:
${financialData}

## ANALYSIS FRAMEWORK:
Use the following systematic approach:

### Step 1: Financial Health Score (1-10 scale)
- **Liquidity Analysis**: Cash flow ratio, emergency fund coverage
- **Debt-to-Income Ratio**: Calculate and assess risk level (universal benchmark: <30% total debt)
- **Savings Rate**: Compare to recommended 15-20% benchmark (globally applicable)
- **Financial Stability**: Based on current data patterns and income consistency

### Step 2: Risk Assessment Matrix
Identify and categorize risks:
- **HIGH RISK**: Issues requiring immediate attention
- **MEDIUM RISK**: Areas for improvement within 3-6 months  
- **LOW RISK**: Long-term optimization opportunities

### Step 3: Actionable Recommendations
For each identified issue, provide:
- **Specific Action**: What exactly to do
- **Timeline**: When to implement (immediate/30 days/90 days)
- **Expected Impact**: Quantify the improvement ($amount or %)
- **Priority Level**: High/Medium/Low

## REQUIRED OUTPUT FORMAT:
\`\`\`
📊 FINANCIAL HEALTH SCORE: [X/10]

🔍 KEY FINDINGS:
• [Most critical insight with specific numbers]
• [Second most important finding]
• [Third key observation]

⚠️ RISK ASSESSMENT:
HIGH: [Specific issues requiring immediate action]
MEDIUM: [Areas for 3-6 month improvement]
LOW: [Long-term optimization opportunities]

🎯 TOP 3 PRIORITY ACTIONS:
1. [Specific action] - Timeline: [X days] - Impact: [$X/month saved or X% improvement]
2. [Specific action] - Timeline: [X days] - Impact: [$X/month saved or X% improvement]  
3. [Specific action] - Timeline: [X days] - Impact: [$X/month saved or X% improvement]

💡 NEXT STEPS:
[Specific 30-day action plan with measurable milestones]
\`\`\`

**CONSTRAINTS:**
- Use only the provided financial data
- Provide specific dollar amounts and percentages
- No generic advice - all recommendations must be personalized
- Include universal financial benchmarks applicable to any country
- Consider different financial systems and local banking practices`,

      savings: `# SAVINGS OPTIMIZATION ANALYSIS

You are a savings specialist with international experience in emergency fund planning and savings optimization. Analyze the savings strategy using universal financial principles applicable to any country's banking system.

## FINANCIAL DATA:
${financialData}

## ANALYSIS METHODOLOGY:
Follow this systematic evaluation process:

### Step 1: Emergency Fund Assessment
- Calculate monthly essential expenses (housing, utilities, food, transportation, insurance)
- Determine recommended emergency fund target (3-6 months of essential expenses - globally applicable)
- Assess current emergency fund adequacy ratio

### Step 2: Savings Rate Analysis
- Calculate current savings rate: (Monthly Income - Monthly Expenses) / Monthly Income × 100
- Compare to universal benchmarks:
  * Minimum: 10% of gross income
  * Good: 15-20% of gross income  
  * Excellent: 20%+ of gross income

### Step 3: Savings Vehicle Optimization
Evaluate current and recommended allocation:
- **High-yield savings accounts**: Emergency fund (3-6 months expenses)
- **Term deposits/CDs**: Short-term goals (1-2 years)
- **Government bonds**: Medium-term goals (2-5 years)
- **Investment accounts**: Long-term goals (5+ years)

## REQUIRED OUTPUT FORMAT:
\`\`\`
💰 SAVINGS HEALTH REPORT

📈 CURRENT METRICS:
• Savings Rate: [X]% (Target: 15-20%)
• Emergency Fund: $[X] ([X] months coverage - Target: 3-6 months)
• Monthly Surplus Available: $[X]

🎯 EMERGENCY FUND ANALYSIS:
Essential Monthly Expenses: $[X]
Current Emergency Fund: $[X] 
Gap: $[X] ([X] months short/surplus)
Status: [CRITICAL/ADEQUATE/EXCELLENT]

🚀 OPTIMIZATION OPPORTUNITIES:
1. [Specific opportunity] - Potential Savings: $[X]/month
2. [Specific opportunity] - Potential Savings: $[X]/month
3. [Specific opportunity] - Potential Savings: $[X]/month

📋 30-DAY ACTION PLAN:
Week 1: [Specific task with dollar target]
Week 2: [Specific task with dollar target]
Week 3: [Specific task with dollar target]
Week 4: [Specific task with dollar target]

🏆 EXPECTED OUTCOMES (90 days):
• Emergency Fund: $[X] → $[X] ([X] months coverage)
• Monthly Savings Rate: [X]% → [X]%
• Additional Monthly Savings: $[X]
\`\`\`

**ANALYSIS REQUIREMENTS:**
- Calculate specific dollar amounts for all recommendations
- Provide timeline for building emergency fund to optimal level
- Consider local banking options and interest rates available in their region
- Include high-yield savings recommendations applicable to their banking system`,

      expenses: `# EXPENSE OPTIMIZATION & COST REDUCTION ANALYSIS

You are a budget optimization expert with international experience in expense analysis and cost reduction strategies. Perform a detailed expense audit using universal budgeting principles.

## FINANCIAL DATA:
${financialData}

## EXPENSE ANALYSIS FRAMEWORK:

### Step 1: Expense Categorization & Benchmarking
Use international budgeting guidelines as baseline:
- **Essential Needs (50-60%)**: Housing, utilities, groceries, transportation, insurance, minimum debt payments
- **Discretionary Spending (20-30%)**: Entertainment, dining out, subscriptions, hobbies, non-essential shopping
- **Savings & Investments (15-20%)**: Emergency fund, investments, retirement savings

### Step 2: Cost Reduction Opportunity Matrix
For each expense category, identify:
- **ELIMINATE**: Unnecessary or duplicate expenses
- **REDUCE**: Expenses that can be lowered through negotiation/switching
- **OPTIMIZE**: Better value alternatives or timing strategies
- **MONITOR**: Expenses to track more carefully

### Step 3: ROI Calculation for Changes
Calculate the annual impact of each potential change:
- Monthly savings × 12 = Annual impact
- Consider implementation difficulty (Easy/Medium/Hard)
- Factor in potential quality-of-life impact

## REQUIRED OUTPUT FORMAT:
\`\`\`
💸 EXPENSE AUDIT RESULTS

📊 CURRENT ALLOCATION vs INTERNATIONAL BENCHMARKS:
• Housing: [X]% (Recommended: 25-35%)
• Transportation: [X]% (Recommended: 10-15%)  
• Food: [X]% (Recommended: 10-15%)
• Utilities: [X]% (Recommended: 5-10%)
• Entertainment: [X]% (Recommended: 5-10%)
• Other Categories: [X]%

🔍 TOP COST-CUTTING OPPORTUNITIES:
1. [Specific expense]: Currently $[X]/month → Target $[X]/month = $[X] annual savings
   • Action: [Specific strategy]
   • Difficulty: [Easy/Medium/Hard]
   • Timeline: [X] days to implement

2. [Specific expense]: Currently $[X]/month → Target $[X]/month = $[X] annual savings  
   • Action: [Specific strategy]
   • Difficulty: [Easy/Medium/Hard]
   • Timeline: [X] days to implement

3. [Specific expense]: Currently $[X]/month → Target $[X]/month = $[X] annual savings
   • Action: [Specific strategy] 
   • Difficulty: [Easy/Medium/Hard]
   • Timeline: [X] days to implement

⚡ QUICK WINS (Implement This Week):
• [Action] - Saves $[X]/month
• [Action] - Saves $[X]/month
• [Action] - Saves $[X]/month

🎯 TOTAL POTENTIAL SAVINGS:
Monthly: $[X] | Annual: $[X] | 5-Year Impact: $[X]

📱 TRACKING RECOMMENDATIONS:
[Specific budgeting methods to monitor expense categories with highest potential for overspending]
\`\`\`

**ANALYSIS STANDARDS:**
- Identify specific expenses by name and amount
- Provide actionable reduction strategies with estimated savings
- Consider regional cost variations and local market conditions
- Include negotiation strategies applicable to local service providers`,

      goals: `# FINANCIAL GOALS STRATEGIC ANALYSIS

You are a goal-setting strategist and financial planner with international expertise in multi-goal prioritization and achievement planning.

## FINANCIAL DATA:
${financialData}

## GOAL ANALYSIS METHODOLOGY:

### Step 1: Goal Feasibility Assessment
For each goal, calculate:
- **Time to completion** at current contribution rate
- **Required monthly contribution** to meet target date  
- **Opportunity cost** of prioritizing this goal over others
- **Risk assessment** of timeline feasibility

### Step 2: Goal Prioritization Matrix
Rank goals using universal criteria:
- **URGENCY**: Time-sensitive goals (home purchase, education funding)
- **IMPACT**: Life-changing potential or security importance
- **FEASIBILITY**: Realistic with current financial capacity
- **DEPENDENCY**: Goals that enable other goals

### Step 3: Resource Allocation Strategy
- Calculate optimal contribution distribution
- Identify funding sources (increased income, reduced expenses, reallocations)
- Plan for goal conflicts and trade-offs
- Create milestone tracking system

## REQUIRED OUTPUT FORMAT:
\`\`\`
🎯 GOAL ACHIEVEMENT STRATEGIC PLAN

📊 GOAL FEASIBILITY ANALYSIS:
[For each goal:]
• [Goal Name]: $[current]/$[target] ([X]% complete)
  - Current Rate: $[X]/month → [X] years to completion
  - Required Rate: $[X]/month → Target completion: [Date]
  - Feasibility: [REALISTIC/CHALLENGING/UNREALISTIC]
  - Priority Rank: [#X] - Reason: [specific justification]

⚖️ RESOURCE ALLOCATION STRATEGY:
Available Monthly Surplus: $[X]
Recommended Distribution:
1. [Priority Goal]: $[X]/month ([X]% of surplus)
2. [Second Goal]: $[X]/month ([X]% of surplus)  
3. [Third Goal]: $[X]/month ([X]% of surplus)

🚩 GOAL CONFLICTS IDENTIFIED:
• [Conflict description] - Resolution: [specific strategy]
• [Conflict description] - Resolution: [specific strategy]

💡 FUNDING OPTIMIZATION STRATEGIES:
1. [Strategy]: Additional $[X]/month → Apply to [specific goal]
2. [Strategy]: Additional $[X]/month → Apply to [specific goal]
3. [Strategy]: Additional $[X]/month → Apply to [specific goal]

📅 MILESTONE ROADMAP (Next 12 Months):
Month 3: [Specific milestone] - [Goal Name] reaches $[X]
Month 6: [Specific milestone] - [Goal Name] reaches $[X]  
Month 9: [Specific milestone] - [Goal Name] reaches $[X]
Month 12: [Specific milestone] - [Goal Name] reaches $[X]

🏆 EXPECTED OUTCOMES:
By [Date]: [Most urgent goal] fully funded
By [Date]: [Second goal] reaches [X]% completion
Total Goal Progress Acceleration: [X] months faster
\`\`\`

**STRATEGIC REQUIREMENTS:**
- Provide specific monthly contribution amounts for each goal
- Address goal conflicts with concrete resolution strategies  
- Include alternative scenarios if income increases/decreases by 10%
- Factor in inflation impact for long-term goals (typical global range: 2-4% annually)`,

      budget: `# COMPREHENSIVE BUDGET ANALYSIS & OPTIMIZATION

You are a certified budget analyst with international expertise in sustainable financial planning and cash flow optimization across different economic systems.

## FINANCIAL DATA:
${financialData}

## BUDGET ANALYSIS FRAMEWORK:

### Step 1: Budget Health Assessment
Apply universal budgeting frameworks:
- **Essential/Discretionary/Savings Model**: Needs/Wants/Savings allocation
- **Zero-Based Budgeting**: Every dollar assigned a purpose
- **Cash Flow Analysis**: Income timing vs expense timing
- **Variance Analysis**: Planned vs actual spending patterns

### Step 2: Sustainability Evaluation
Assess long-term viability:
- **Income Stability**: Single vs multiple income streams
- **Expense Flexibility**: Fixed vs variable expense ratio
- **Seasonal Variations**: Account for irregular expenses
- **Economic Resilience**: Buffer for economic downturns

### Step 3: Optimization Opportunities
Identify improvements:
- **Rebalancing**: Move money between categories for better outcomes
- **Automation**: Reduce decision fatigue and improve consistency
- **Buffers**: Build in cushions for unexpected expenses
- **Efficiency**: Reduce time spent on budget management

## REQUIRED OUTPUT FORMAT:
\`\`\`
📊 BUDGET HEALTH REPORT

💰 CURRENT BUDGET ALLOCATION:
Income: $[X]/month
Fixed Expenses: $[X] ([X]%)
Variable Expenses: $[X] ([X]%)
Savings/Investments: $[X] ([X]%)
Available Surplus: $[X] ([X]%)

🎯 INTERNATIONAL BENCHMARK ANALYSIS:
Essential Expenses: [X]% (Recommended: 50-60%)
Discretionary Spending: [X]% (Recommended: 20-30%)  
Savings & Investments: [X]% (Recommended: 15-20%)

⚠️ SUSTAINABILITY RISKS:
HIGH: [Issues requiring immediate budget restructuring]
MEDIUM: [Areas needing monitoring and gradual adjustment]
LOW: [Minor optimizations for improved efficiency]

🔧 OPTIMIZATION RECOMMENDATIONS:
1. **Rebalancing Opportunity**
   • Move $[X] from [Category A] to [Category B]
   • Impact: [Specific benefit] 
   • Implementation: [Step-by-step process]

2. **Automation Setup**
   • Automate: [Specific transactions]
   • Frequency: [Weekly/Monthly]
   • Expected Benefit: [Time saved + consistency improvement]

3. **Buffer Implementation**  
   • Create $[X] buffer for [Category]
   • Funding source: [Specific reallocation]
   • Risk mitigation: [Specific scenarios covered]

📈 PERFORMANCE TRACKING SYSTEM:
Weekly: Review [specific categories with highest variance]
Monthly: Analyze [specific metrics] vs targets
Quarterly: Reassess [budget allocations] based on [specific triggers]

🎯 90-DAY BUDGET GOALS:
• Reduce [Category] spending by $[X]/month
• Increase savings rate from [X]% to [X]%
• Achieve [X]% consistency in variable expenses
• Build $[X] buffer fund

📱 RECOMMENDED TOOLS:
[Universal budgeting methods based on complexity of their situation]
\`\`\`

**ANALYSIS STANDARDS:**
- Provide specific dollar amounts for all recommendations
- Address both overspending and underspending issues
- Consider psychological aspects of budgeting success
- Include contingency planning for income changes and economic uncertainty`,

      investment: `# INVESTMENT READINESS & STRATEGY ANALYSIS

You are a fee-only financial advisor with international investment expertise and knowledge of global portfolio construction principles.

## FINANCIAL DATA:
${financialData}

## INVESTMENT ANALYSIS FRAMEWORK:

### Step 1: Investment Readiness Assessment
Evaluate universal prerequisites:
- **Emergency Fund**: 3-6 months expenses in liquid savings
- **High-Interest Debt**: Credit cards and other debt >6-8% APR paid off
- **Stable Income**: Consistent cash flow for regular investing
- **Investment Timeline**: Goals with 5+ year time horizon
- **Risk Capacity**: Financial ability to withstand losses

### Step 2: Risk Profile Development
Assess investor characteristics:
- **Risk Tolerance**: Emotional comfort with volatility
- **Risk Capacity**: Financial ability to take risks  
- **Time Horizon**: Years until funds needed
- **Liquidity Needs**: Access requirements for invested funds
- **Local Market Considerations**: Available investment options in their region

### Step 3: Strategic Asset Allocation
Design portfolio structure using global principles:
- **Age-Based Approach**: 100 minus age in growth investments (universal guideline)
- **Goal-Based Allocation**: Different allocations for different objectives
- **Tax-Efficient Strategy**: Prioritize tax-advantaged accounts available locally
- **Diversification Strategy**: Domestic, international, and alternative assets

## REQUIRED OUTPUT FORMAT:
\`\`\`
🎯 INVESTMENT READINESS ASSESSMENT

✅ PREREQUISITE CHECKLIST:
• Emergency Fund: [COMPLETE/NEEDS $X MORE] - Current: $[X] (Target: $[X])
• High-Interest Debt: [CLEAR/PAYOFF $X AT X% APR FIRST]
• Stable Income: [STABLE/VARIABLE] - Monthly variance: [±X]%
• Investment Timeline: [READY/WAIT X MONTHS]
Overall Readiness: [READY TO INVEST/COMPLETE PREREQUISITES FIRST]

📊 RISK PROFILE ANALYSIS:
Investment Timeline: [X] years
Risk Tolerance: [CONSERVATIVE/MODERATE/AGGRESSIVE]
Risk Capacity: [LOW/MEDIUM/HIGH] based on [specific factors]
Recommended Risk Level: [CONSERVATIVE/MODERATE/AGGRESSIVE]

💼 STRATEGIC ASSET ALLOCATION:
[If ready to invest:]
**Portfolio Recommendation:**
• Domestic Stocks/Equities: [X]% (Target: $[X])
• International Stocks/Equities: [X]% (Target: $[X])
• Bonds/Fixed Income: [X]% (Target: $[X])  
• Real Estate (REITs/Property): [X]% (Target: $[X])
• Cash/Money Market: [X]% (Target: $[X])

📈 IMPLEMENTATION STRATEGY:
**Phase 1 (Months 1-3):**
• Maximize employer retirement matching: $[X]/month
• Open tax-advantaged investment account: $[X]/month
• Target allocation: [simplified portfolio for starting]

**Phase 2 (Months 4-12):**  
• Increase contributions to: $[X]/month
• Add [specific investments]: [X]% allocation
• Rebalance quarterly

🎯 TAX-ADVANTAGED OPTIMIZATION:
1. Employer retirement plan matching: $[X]/month (Priority: HIGH)
2. Individual retirement savings account: $[X]/month (Priority: HIGH)  
3. Tax-free savings account (if available): $[X]/month (Priority: MEDIUM)
4. Additional retirement contributions: $[X]/month (Priority: MEDIUM)
5. Taxable investing: $[X]/month (Priority: LOW)

⚠️ KEY CONSIDERATIONS:
• [Specific risks for their situation]
• [Important milestones to reassess strategy]
• [Local tax implications and available investment vehicles]

📚 NEXT STEPS:
1. [Research local investment account options] - Timeline: [X] days
2. [Investigate available low-cost index funds/ETFs] - Decision needed by: [Date]
3. [Set up automatic investment plan] - Complete by: [Date]
\`\`\`

**ADVISORY STANDARDS:**
- Only recommend investment if prerequisites are met
- Focus on low-cost, globally diversified investment options
- Include local tax implications and available investment vehicles
- Address common behavioral investing mistakes universally applicable
- Factor in their specific goals, timelines, and local market access`,
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.overview;
  };

  // Handle quick analysis in prompt mode
  const handleQuickAnalysisPrompt = (analysisType: string) => {
    const prompt = generateAnalysisPrompt(analysisType);
    setGeneratedPrompt(prompt);
    setResult(null);
  };

  // Handle custom query in prompt mode
  const handleCustomQueryPrompt = () => {
    if (!state.userPlan || !query.trim()) return;

    const financialData = generateFinancialSummary();
    const customPrompt = `# CUSTOM FINANCIAL ANALYSIS REQUEST

You are a certified financial planner with 15+ years of international experience in personal financial planning across different economic systems. A client has asked you the following specific question, and you need to provide expert analysis using their actual financial data.

## CLIENT QUESTION:
"${query.trim()}"

## CLIENT'S FINANCIAL DATA:
${financialData}

## ANALYSIS FRAMEWORK:
Please follow this systematic approach to answer their question:

### Step 1: Question Classification & Context
- **Category**: [Investment/Budgeting/Savings/Debt/Goals/Risk Management/Tax Strategy/Other]
- **Urgency Level**: [Immediate/Short-term (3 months)/Medium-term (1 year)/Long-term (3+ years)]
- **Complexity**: [Simple/Moderate/Complex] based on financial situation
- **Geographic Context**: [Consider local financial system differences and regulations]

### Step 2: Data Analysis & Key Insights
- **Relevant Financial Metrics**: Extract and calculate metrics directly related to the question
- **Current Position Assessment**: Evaluate where they stand regarding this specific question
- **Risk Factors**: Identify any risks or red flags related to this topic

### Step 3: Expert Recommendations
- **Primary Recommendation**: Most important action to take
- **Alternative Options**: 2-3 additional strategies or approaches
- **Implementation Timeline**: Specific deadlines and milestones
- **Expected Outcomes**: Quantified benefits and potential results

### Step 4: Personalized Action Plan
- **Immediate Actions** (Next 7 days): Specific tasks they can complete immediately
- **Short-term Actions** (Next 30 days): Steps to implement the strategy
- **Long-term Follow-up** (3-6 months): How to monitor progress and adjust

## REQUIRED OUTPUT FORMAT:
\`\`\`
🎯 EXPERT ANALYSIS FOR: [Restate their question]

📊 SITUATION ASSESSMENT:
• Category: [Classification]
• Current Position: [Specific assessment with numbers]
• Key Insight: [Most important finding from their data]

⚠️ RISK ANALYSIS:
• Primary Risk: [Main concern to address]
• Risk Level: [Low/Medium/High]
• Mitigation Strategy: [How to address the risk]

💡 EXPERT RECOMMENDATIONS:

**PRIMARY STRATEGY:**
• Action: [Specific recommendation]
• Rationale: [Why this is the best approach for their situation]
• Expected Impact: [Quantified benefit - dollar amount or percentage]

**ALTERNATIVE APPROACHES:**
1. [Option 1]: [Brief description] - Best for: [Specific circumstances]
2. [Option 2]: [Brief description] - Best for: [Specific circumstances]
3. [Option 3]: [Brief description] - Best for: [Specific circumstances]

📋 7-DAY ACTION PLAN:
Day 1-2: [Specific task with expected time commitment]
Day 3-4: [Specific task with expected time commitment]
Day 5-7: [Specific task with expected time commitment]

📈 SUCCESS METRICS:
• 30 Days: [Measurable milestone]
• 90 Days: [Measurable milestone]
• 6 Months: [Long-term goal]

⚠️ RED FLAGS TO WATCH:
• [Warning sign 1]: [What to do if this occurs]
• [Warning sign 2]: [What to do if this occurs]

🔍 ADDITIONAL CONSIDERATIONS:
[Any tax implications, legal considerations, or other important factors specific to their question and financial situation]

🌍 LOCAL ADAPTATION NOTES:
[Regional factors to consider, local financial products to research, or when to seek local professional advice]
\`\`\`

## EXPERT GUIDELINES:
- **Client's Best Interest**: Provide advice that prioritizes the client's financial wellbeing only
- **Specific Numbers**: Use their actual financial data to calculate recommendations
- **Risk Disclosure**: Clearly identify any risks associated with recommendations
- **Realistic Expectations**: Base all projections on their current financial capacity
- **Universal Principles**: Apply internationally recognized financial planning best practices
- **Personalization**: All recommendations must be specific to their unique situation
- **Local Adaptation**: Acknowledge when local expertise or research may be needed

## CONSTRAINTS:
- Only use the provided financial data - do not make assumptions about missing information
- Provide specific amounts and percentages whenever possible
- If additional information is needed, clearly state what information would help refine the advice
- Do not provide investment advice unless they have emergency fund and stable financial foundation
- Include disclaimers for any recommendations involving market risk or regulatory changes
- Acknowledge regional differences in financial products and regulations when relevant`;

    setGeneratedPrompt(customPrompt);
    setResult(null);
  };

  // Copy prompt to clipboard
  const copyPromptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error("Failed to copy prompt:", err);
    }
  };

  // API mode handlers (preserved from original)
  const handleQuickAnalysis = async (analysisType: string) => {
    if (!state.userPlan) return;

    try {
      setResult(null);
      const analysisResult = await aiAnalysisService.quickAnalysis(
        state.userPlan,
        analysisType
      );
      setResult(analysisResult);
    } catch (error) {
      console.error("Quick analysis failed:", error);
      setResult({
        success: false,
        error: "Failed to perform analysis. Please try again.",
      });
    }
  };

  const handleCustomQuery = async () => {
    if (!state.userPlan || !query.trim()) return;

    // Validate request
    const validationErrors = aiAnalysisService.validateRequest({
      userPlan: state.userPlan,
      query: query.trim(),
      model: selectedModel,
    });

    if (validationErrors.length > 0) {
      setResult({
        success: false,
        error: validationErrors.join(", "),
      });
      return;
    }

    try {
      setResult(null);
      const analysisResult = await aiAnalysisService.analyzeFinancialData({
        userPlan: state.userPlan,
        query: query.trim(),
        model: selectedModel,
        analysisType: "general",
      });
      setResult(analysisResult);
    } catch (error) {
      console.error("Custom analysis failed:", error);
      setResult({
        success: false,
        error: "Failed to analyze your question. Please try again.",
      });
    }
  };

  const handleClearResult = () => {
    setResult(null);
    setQuery("");
    setGeneratedPrompt("");
    setCopiedPrompt(false);
  };

  const formatAnalysis = (analysis: string) => {
    // Simple formatting to improve readability
    return analysis
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line, index) => (
        <p key={index} className="mb-2">
          {line.trim()}
        </p>
      ));
  };

  // Determine which mode to show
  const isApiMode = AI_CONFIG.mode === "api" && AI_CONFIG.enableApiMode;
  const isPromptMode = AI_CONFIG.mode === "prompt" || !AI_CONFIG.enableApiMode;

  // Button rendering logic
  if (isApiMode) {
    // API mode: Show setup button if not configured, otherwise show Ask AI
    if (!serviceStatus?.enabled || !serviceStatus?.connectionStatus) {
      return (
        <button
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg ${className}`}
          title={t("ai.setup.title")}
        >
          <span className="text-lg">🤖</span>
          <span>{t("ai.button.setup")}</span>
        </button>
      );
    }
  }

  // Show AI Assistant button for both modes
  return (
    <>
      {/* Ask AI Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${className}`}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <span className="text-lg">🤖</span>
            <span>{isPromptMode ? t("ai.button.assistant") : t("ai.button.ask")}</span>
          </>
        )}
      </button>

      {/* AI Analysis Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Background overlay */}
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Container */}
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            {/* Modal */}
            <div className="relative z-50 bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {isPromptMode
                          ? t("ai.modal.title.prompt")
                          : t("ai.modal.title.advisor")}
                      </h3>
                      <p className="text-purple-100 text-sm">
                        {isPromptMode
                          ? t("ai.modal.subtitle.prompt")
                          : t("ai.modal.subtitle.advisor")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                {/* API Mode - Setup Instructions (when AI not configured) */}
                {isApiMode &&
                  (!serviceStatus?.enabled ||
                    !serviceStatus?.connectionStatus) && (
                    <div className="text-center py-8 space-y-6">
                      <div className="text-6xl mb-4">🤖</div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {t("ai.setup.title")}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {t("ai.setup.desc")}
                      </p>

                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-left">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          {t("ai.setup.instructions")}
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
                          <li>
                            Create a{" "}
                            <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">
                              .env.local
                            </code>{" "}
                            file in your project root
                          </li>
                          <li>Add the following environment variables:</li>
                        </ol>

                        <div className="mt-4 p-3 bg-gray-900 dark:bg-gray-800 rounded text-green-400 text-sm font-mono">
                          <div>AI_FEATURES_ENABLED=true</div>
                          <div>OPENROUTER_API_KEY=your_api_key_here</div>
                          <div>DEFAULT_AI_MODEL=anthropic/claude-3-sonnet</div>
                        </div>

                        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                          <p>
                            <strong>To get an OpenRouter API key:</strong>
                          </p>
                          <ol className="list-decimal list-inside mt-2 space-y-1">
                            <li>
                              Visit{" "}
                              <a
                                href="https://openrouter.ai/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                openrouter.ai
                              </a>
                            </li>
                            <li>Sign up for a free account</li>
                            <li>Go to API Keys section</li>
                            <li>Create a new API key</li>
                            <li>Add $5-10 credits to your account</li>
                            <li>
                              Replace &quot;your_api_key_here&quot; with your
                              actual key
                            </li>
                          </ol>
                        </div>
                      </div>

                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        After setting up, restart your development server and
                        the AI features will be available.
                      </p>
                    </div>
                  )}

                {/* Show interface for configured API mode or prompt mode */}
                {(isPromptMode ||
                  (isApiMode &&
                    serviceStatus?.enabled &&
                    serviceStatus?.connectionStatus)) && (
                    <>
                      {/* Mode indicator for prompt mode */}
                      {isPromptMode && (
                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-blue-600 dark:text-blue-400">
                              📋
                            </span>
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                              {t("ai.mode.prompt.title")}
                            </h4>
                          </div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {t("ai.mode.prompt.desc")}
                          </p>
                        </div>
                      )}

                      {/* Tabs */}
                      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                        <button
                          onClick={() => setActiveTab("quick")}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "quick"
                            ? "border-blue-500 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            }`}
                        >
                          {t("ai.tab.quick")}
                        </button>
                        <button
                          onClick={() => setActiveTab("custom")}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "custom"
                            ? "border-blue-500 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            }`}
                        >
                          {t("ai.tab.custom")}
                        </button>
                      </div>

                      {/* Quick Analysis Tab */}
                      {activeTab === "quick" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          {quickOptions.map((option) => (
                            <button
                              key={option.id}
                              onClick={() =>
                                isPromptMode
                                  ? handleQuickAnalysisPrompt(option.id)
                                  : handleQuickAnalysis(option.id)
                              }
                              disabled={isLoading}
                              className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{option.icon}</span>
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                    {option.title}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {option.description}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Custom Question Tab */}
                      {activeTab === "custom" && (
                        <div className="space-y-4 mb-6">
                          {/* Model Selection (API mode only) */}
                          {isApiMode &&
                            serviceStatus?.availableModels &&
                            serviceStatus.availableModels.length > 1 && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  {t("ai.model")}
                                </label>
                                <select
                                  value={selectedModel}
                                  onChange={(e) =>
                                    setSelectedModel(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  {serviceStatus.availableModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                      {model.name} - {model.description}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                          {/* Question Input */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {t("ai.custom.label")}
                            </label>
                            <textarea
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              placeholder={t("ai.custom.placeholder")}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                              disabled={isLoading}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {query.length}/5000 characters
                            </p>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={
                              isPromptMode
                                ? handleCustomQueryPrompt
                                : handleCustomQuery
                            }
                            disabled={isLoading || !query.trim()}
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition-colors disabled:cursor-not-allowed"
                          >
                            {isLoading
                              ? t("ai.analyzing")
                              : isPromptMode
                                ? t("ai.custom.button.generate")
                                : t("ai.custom.button.analyze")}
                          </button>
                        </div>
                      )}

                      {/* Loading State (API mode only) */}
                      {isApiMode && isLoading && (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-300">
                              AI is analyzing your financial data...
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              This may take a few moments
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Generated Prompt Display (Prompt mode) */}
                      {isPromptMode && generatedPrompt && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <span>📋</span>
                                {t("ai.generatedPrompt")}
                              </h4>
                              <button
                                onClick={copyPromptToClipboard}
                                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${copiedPrompt
                                  ? "bg-green-600 text-white"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                                  }`}
                              >
                                {copiedPrompt ? (
                                  <>
                                    <span className="mr-2">✓</span>
                                    {t("ai.copied")}
                                  </>
                                ) : (
                                  <>
                                    <span className="mr-2">📋</span>
                                    {t("ai.copy")}
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono leading-relaxed">
                                {generatedPrompt}
                              </pre>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                              <div className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-0.5">
                                  💡
                                </span>
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                  <p className="font-medium mb-1">
                                    {t("ai.howToUse")}
                                  </p>
                                  <ol className="list-decimal list-inside space-y-1">
                                    <li>
                                      {t("ai.step1")}
                                    </li>
                                    <li>
                                      {t("ai.step2")}
                                    </li>
                                    <li>{t("ai.step3")}</li>
                                    <li>
                                      {t("ai.step4")}
                                    </li>
                                  </ol>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* API Results (API mode only) */}
                      {isApiMode && result && !isLoading && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                          {result.success ? (
                            <div className="space-y-6">
                              {/* Analysis */}
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                  <span>🔍</span>
                                  {t("ai.result.analysis")}
                                </h4>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-gray-700 dark:text-gray-300">
                                  {formatAnalysis(result.data?.analysis || "")}
                                </div>
                              </div>

                              {/* Suggestions */}
                              {result.data?.suggestions &&
                                result.data.suggestions.length > 0 && (
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                      <span>💡</span>
                                      {t("ai.result.recommendations")}
                                    </h4>
                                    <ul className="space-y-2">
                                      {result.data.suggestions
                                        .slice(0, 5)
                                        .map((suggestion, index) => (
                                          <li
                                            key={index}
                                            className="flex items-start gap-2"
                                          >
                                            <span className="text-green-500 mt-1">
                                              •
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                              {suggestion}
                                            </span>
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                )}

                              {/* Next Steps */}
                              {result.data?.nextSteps &&
                                result.data.nextSteps.length > 0 && (
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                      <span>🚀</span>
                                      {t("ai.result.nextSteps")}
                                    </h4>
                                    <ul className="space-y-2">
                                      {result.data.nextSteps
                                        .slice(0, 4)
                                        .map((step, index) => (
                                          <li
                                            key={index}
                                            className="flex items-start gap-2"
                                          >
                                            <span className="text-blue-500 font-semibold mt-1">
                                              {index + 1}.
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                              {step}
                                            </span>
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                )}

                              {/* Metadata */}
                              {result.metadata && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-3">
                                  Analysis by {result.metadata.model} • Processing
                                  time: {result.metadata.processingTime}ms •
                                  {result.metadata.timestamp}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">⚠️</span>
                              </div>
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                {t("ai.result.failed")}
                              </h4>
                              <p className="text-gray-600 dark:text-gray-300 mb-4">
                                {result.error ||
                                  "Something went wrong. Please try again."}
                              </p>
                              <button
                                onClick={handleClearResult}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm"
                              >
                                {t("ai.result.tryAgain")}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isPromptMode
                      ? t("ai.footer.prompt")
                      : t("ai.footer.api")}
                  </div>
                  <div className="flex items-center gap-2">
                    {(result || generatedPrompt) && (
                      <button
                        onClick={handleClearResult}
                        className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                      >
                        {t("ai.clear")}
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
                    >
                      {t("ai.close")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
