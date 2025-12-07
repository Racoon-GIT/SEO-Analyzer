// ============================================================================
// API ROUTE: /api/agent
// Securely proxies requests to Anthropic API
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';
import { AGENTS } from '@/lib/agents';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const maxDuration = 60; // Allow up to 60 seconds for agent responses

export async function POST(request) {
  try {
    const body = await request.json();
    const { agentId, context, projectConfig, products, gscData } = body;

    // Validate agent
    const agent = AGENTS[agentId];
    if (!agent) {
      return Response.json({ error: 'Agent non trovato' }, { status: 400 });
    }

    // Build the user prompt with context
    let userPrompt = `
CONFIGURAZIONE PROGETTO:
- Dominio: ${projectConfig?.domain || process.env.DEFAULT_DOMAIN || 'example.com'}
- Nicchia: ${projectConfig?.niche || process.env.DEFAULT_NICHE || 'e-commerce'}
- Brand: ${projectConfig?.brandName || process.env.DEFAULT_BRAND || 'Brand'}

`;

    // Add previous results if available
    if (context?.previousResults && Object.keys(context.previousResults).length > 0) {
      userPrompt += `\nRISULTATI AGENTI PRECEDENTI:\n`;
      for (const [prevAgentId, result] of Object.entries(context.previousResults)) {
        userPrompt += `\n--- ${AGENTS[prevAgentId]?.name || prevAgentId} ---\n`;
        userPrompt += JSON.stringify(result, null, 2).slice(0, 3000); // Limit size
        userPrompt += '\n';
      }
    }

    // Add products for strategist and writer
    if (products && products.length > 0 && (agentId === 'strategist' || agentId === 'contentWriter')) {
      const sampleProducts = products.slice(0, 10);
      userPrompt += `\nCAMPIONE PRODOTTI (${products.length} totali):\n${JSON.stringify(sampleProducts, null, 2)}\n`;
    }

    // Add GSC data for technical auditor
    if (gscData && agentId === 'technicalAuditor') {
      const gscSample = Array.isArray(gscData) ? gscData.slice(0, 50) : gscData;
      userPrompt += `\nDATI GOOGLE SEARCH CONSOLE:\n${JSON.stringify(gscSample, null, 2)}\n`;
    }

    userPrompt += `\nEsegui la tua analisi. Usa web search per raccogliere dati reali e aggiornati. Rispondi SOLO con il JSON richiesto nel formato specificato.`;

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: parseInt(process.env.MAX_TOKENS) || 4096,
      system: agent.systemPrompt,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        }
      ],
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    // Extract text response
    let resultText = '';
    let toolUses = [];
    
    for (const block of response.content || []) {
      if (block.type === 'text') {
        resultText += block.text;
      } else if (block.type === 'tool_use') {
        toolUses.push(block);
      }
    }

    // Try to parse JSON from response
    let result;
    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: resultText };
    } catch (e) {
      result = { raw: resultText, parseError: true };
    }

    return Response.json({
      success: true,
      agentId,
      result,
      toolsUsed: toolUses.length,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    });

  } catch (error) {
    console.error('Agent execution error:', error);
    
    return Response.json({
      success: false,
      error: error.message || 'Errore durante l\'esecuzione dell\'agente',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
