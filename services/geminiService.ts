import { GoogleGenAI } from "@google/genai";
import { FinancialSnapshot, Transaction } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFinancialAdvice = async (
  snapshot: FinancialSnapshot,
  recentTransactions: Transaction[]
): Promise<string> => {
  
  const transactionSummary = recentTransactions
    .slice(0, 10)
    .map(t => `${t.date.split('T')[0]}: ${t.description} ($${t.amount})`)
    .join('\n');

  const prompt = `
    You are an expert financial advisor in a gamified finance app called "SmartWallet".
    
    User Financial Snapshot:
    - Total Income: $${snapshot.totalIncome}
    - Total Expenses: $${snapshot.totalExpenses}
    - Current Balance: $${snapshot.balance}
    - Savings Rate: ${snapshot.savingsRate.toFixed(1)}%
    
    Recent Transactions:
    ${transactionSummary}
    
    Based on the Savings Rate, act as one of the following personas and provide advice in the specific format.
    
    TIER 1: If Savings Rate > 20%: "Wealth Builder Mode"
    Tone: Celebratory, strategic, advanced.
    Content: Recommend investing, emergency funds, and guilt-free spending.
    
    TIER 2: If Savings Rate < 5%: "Budget Alert Mode"
    Tone: Urgent, helpful, tactical.
    Content: Identify top 2 spending categories to cut, suggest quick wins.
    
    TIER 3: If Savings Rate is 5-20%: "Growth Mode"
    Tone: Encouraging, coaching.
    Content: Challenge them to increase by 5%, suggest small lifestyle tweaks (lunch from home, etc).

    Output Format (Markdown):
    **[Mode Name] Activated!**
    
    [Short paragraph context]
    
    **Action Plan:**
    * [Action 1]
    * [Action 2]
    
    **Insight:**
    [One specifc observation about their recent transactions]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "I couldn't analyze your finances at this moment. Please try again later.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Financial Advisor is currently offline. Please check your connection.";
  }
};