// ============================================================================
// API ROUTE: /api/analyze-gsc
// Analyzes GSC data on the server
// ============================================================================

import { analyzeGSCData } from '@/lib/gsc-analyzer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!data) {
      return Response.json({ error: 'Nessun dato fornito' }, { status: 400 });
    }

    const analysis = analyzeGSCData(type, data);

    return Response.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('GSC analysis error:', error);
    
    return Response.json({
      success: false,
      error: error.message || 'Errore durante l\'analisi dei dati GSC'
    }, { status: 500 });
  }
}
