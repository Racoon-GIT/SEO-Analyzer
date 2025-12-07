// ============================================================================
// GSC DATA ANALYZER
// Functions to parse and analyze Google Search Console data
// ============================================================================

/**
 * Parse CSV/TSV data from GSC export
 */
export function parseGSCData(data) {
  const lines = data.trim().split('\n');
  if (lines.length < 2) return { error: 'Dati insufficienti', rows: [] };
  
  // Detect delimiter (tab or comma)
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = delimiter === '\t' 
      ? line.split('\t')
      : line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    
    const obj = {};
    headers.forEach((h, i) => {
      let val = values[i]?.replace(/"/g, '').trim() || '';
      obj[h] = val;
    });
    return obj;
  }).filter(r => Object.values(r).some(v => v));

  return { headers, rows };
}

/**
 * Analyze query performance data
 */
export function analyzeQueryPerformance(data) {
  const { rows } = parseGSCData(data);
  if (rows.length === 0) return { error: 'Nessun dato valido' };

  const withMetrics = rows.map(r => ({
    query: r.query || r['top queries'] || r['query'],
    clicks: parseInt(r.clicks) || 0,
    impressions: parseInt(r.impressions) || 0,
    ctr: parseFloat(r.ctr?.replace('%', '').replace(',', '.')) || 0,
    position: parseFloat(r.position?.replace(',', '.')) || 0
  })).filter(r => r.query && r.impressions > 0);

  if (withMetrics.length === 0) return { error: 'Nessuna query con dati validi' };

  const topByClicks = [...withMetrics].sort((a, b) => b.clicks - a.clicks).slice(0, 10);
  const topByImpressions = [...withMetrics].sort((a, b) => b.impressions - a.impressions).slice(0, 10);
  const lowCTR = withMetrics.filter(r => r.impressions > 100 && r.ctr < 2).sort((a, b) => b.impressions - a.impressions).slice(0, 10);
  const position2ndPage = withMetrics.filter(r => r.position > 10 && r.position <= 20).sort((a, b) => b.impressions - a.impressions).slice(0, 10);
  
  const avgPosition = withMetrics.reduce((a, b) => a + b.position, 0) / withMetrics.length;
  const avgCTR = withMetrics.reduce((a, b) => a + b.ctr, 0) / withMetrics.length;
  const totalClicks = withMetrics.reduce((a, b) => a + b.clicks, 0);
  const totalImpressions = withMetrics.reduce((a, b) => a + b.impressions, 0);

  return {
    summary: {
      totalQueries: withMetrics.length,
      totalClicks,
      totalImpressions,
      avgPosition: avgPosition.toFixed(1),
      avgCTR: avgCTR.toFixed(2) + '%'
    },
    insights: [
      `📊 **${withMetrics.length} query** attive con **${totalClicks.toLocaleString()} click** totali`,
      `📍 Posizione media: **${avgPosition.toFixed(1)}** — ${avgPosition < 10 ? 'buona!' : avgPosition < 20 ? 'da migliorare' : 'serve lavoro'}`,
      `🖱️ CTR medio: **${avgCTR.toFixed(2)}%** — ${avgCTR > 3 ? 'sopra la media!' : 'c\'è margine di miglioramento sui title/meta'}`,
      lowCTR.length > 0 ? `⚠️ **${lowCTR.length} query** con alto volume ma CTR sotto 2% — opportunità di ottimizzazione title/meta` : null,
      position2ndPage.length > 0 ? `🎯 **${position2ndPage.length} query** in seconda pagina — quick win potenziali` : null
    ].filter(Boolean),
    data: { topByClicks, topByImpressions, lowCTR, position2ndPage }
  };
}

/**
 * Analyze page performance data
 */
export function analyzePagePerformance(data) {
  const { rows } = parseGSCData(data);
  if (rows.length === 0) return { error: 'Nessun dato valido' };

  const withMetrics = rows.map(r => ({
    page: r.page || r['top pages'] || r.url,
    clicks: parseInt(r.clicks) || 0,
    impressions: parseInt(r.impressions) || 0,
    ctr: parseFloat(r.ctr?.replace('%', '').replace(',', '.')) || 0,
    position: parseFloat(r.position?.replace(',', '.')) || 0
  })).filter(r => r.page && r.impressions > 0);

  const topPages = [...withMetrics].sort((a, b) => b.clicks - a.clicks).slice(0, 10);
  const underperforming = withMetrics.filter(r => r.impressions > 500 && r.ctr < 1.5).slice(0, 10);
  
  const productPages = withMetrics.filter(r => r.page.includes('/products/'));
  const collectionPages = withMetrics.filter(r => r.page.includes('/collections/'));
  const blogPages = withMetrics.filter(r => r.page.includes('/blog'));

  return {
    summary: {
      totalPages: withMetrics.length,
      productPages: productPages.length,
      collectionPages: collectionPages.length,
      blogPages: blogPages.length
    },
    insights: [
      `📄 **${withMetrics.length} pagine** indicizzate con traffico`,
      `🛍️ **${productPages.length} pagine prodotto** | **${collectionPages.length} collection** | **${blogPages.length} blog**`,
      underperforming.length > 0 ? `⚠️ **${underperforming.length} pagine** con alto volume ma CTR basso — i title/meta non convertono` : null,
      topPages[0] ? `🏆 Top page: **${topPages[0].page.split('/').pop()}** con ${topPages[0].clicks} click` : null
    ].filter(Boolean),
    data: { topPages, underperforming, breakdown: { productPages: productPages.length, collectionPages: collectionPages.length, blogPages: blogPages.length } }
  };
}

/**
 * Analyze quick wins (keywords in positions 11-20)
 */
export function analyzeQuickWins(data) {
  const { rows } = parseGSCData(data);
  if (rows.length === 0) return { error: 'Nessun dato valido' };

  const withMetrics = rows.map(r => ({
    query: r.query || r['top queries'],
    clicks: parseInt(r.clicks) || 0,
    impressions: parseInt(r.impressions) || 0,
    position: parseFloat(r.position?.replace(',', '.')) || 0
  })).filter(r => r.query && r.position > 10 && r.position <= 20);

  const sorted = withMetrics.sort((a, b) => b.impressions - a.impressions).slice(0, 15);
  const totalPotential = sorted.reduce((a, b) => a + Math.floor(b.impressions * 0.05), 0);

  return {
    summary: { count: sorted.length, potentialClicks: totalPotential },
    insights: [
      `🎯 **${sorted.length} query in seconda pagina** — vicine alla prima pagina!`,
      `💡 Se queste salissero in top 10, potresti ottenere circa **+${totalPotential} click/mese**`,
      `🔧 Azioni: migliorare contenuto pagine target, aggiungere internal link, ottimizzare title per queste keyword`
    ],
    data: { quickWins: sorted }
  };
}

/**
 * Analyze CTR opportunities (high impressions, low CTR)
 */
export function analyzeCTROpportunities(data) {
  const { rows } = parseGSCData(data);
  if (rows.length === 0) return { error: 'Nessun dato valido' };

  const withMetrics = rows.map(r => ({
    query: r.query || r['top queries'],
    clicks: parseInt(r.clicks) || 0,
    impressions: parseInt(r.impressions) || 0,
    ctr: parseFloat(r.ctr?.replace('%', '').replace(',', '.')) || 0,
    position: parseFloat(r.position?.replace(',', '.')) || 0
  })).filter(r => r.query && r.impressions > 500 && r.ctr < 2);

  const sorted = withMetrics.sort((a, b) => b.impressions - a.impressions).slice(0, 15);
  const potentialGain = sorted.reduce((a, b) => a + Math.floor(b.impressions * 0.03), 0);

  return {
    summary: { count: sorted.length, potentialClicks: potentialGain },
    insights: [
      `⚠️ **${sorted.length} query** con alto volume ma CTR sotto 2%`,
      `📝 Problema probabile: **title e meta description** non attraenti o non allineati al search intent`,
      `💡 Ottimizzando title/meta potresti guadagnare circa **+${potentialGain} click/mese**`,
      `🔍 Analizza: i title rispondono alla domanda dell'utente? Le meta hanno CTA chiare?`
    ],
    data: { opportunities: sorted }
  };
}

/**
 * Main analyzer function that routes to specific analyzers
 */
export function analyzeGSCData(type, data) {
  switch (type) {
    case 'query_performance':
      return analyzeQueryPerformance(data);
    case 'page_performance':
      return analyzePagePerformance(data);
    case 'quick_wins':
      return analyzeQuickWins(data);
    case 'ctr_opportunities':
      return analyzeCTROpportunities(data);
    default:
      const { rows } = parseGSCData(data);
      return {
        summary: { rows: rows.length },
        insights: [`📊 Ricevuti ${rows.length} righe di dati`],
        data: { raw: rows.slice(0, 20) }
      };
  }
}
