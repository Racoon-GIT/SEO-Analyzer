// ============================================================================
// GSC DATA ANALYZER - IMPROVED VERSION
// Handles multiple formats: CSV, TSV, space-separated, direct copy from GSC
// ============================================================================

/**
 * Parse CSV/TSV/space-separated data from GSC export
 * More robust parsing that handles various formats
 */
export function parseGSCData(data) {
  if (!data || typeof data !== 'string') {
    return { error: 'Nessun dato fornito', rows: [] };
  }

  const lines = data.trim().split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return { error: 'Dati insufficienti (serve almeno header + 1 riga)', rows: [] };
  }

  // Try to detect delimiter
  const firstLine = lines[0];
  let delimiter;
  
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.includes(',') && !firstLine.match(/^\d.*,\d/)) {
    delimiter = ',';
  } else if (firstLine.includes(';')) {
    delimiter = ';';
  } else {
    delimiter = 'smart';
  }

  let headers = [];
  let rows = [];

  if (delimiter === 'smart') {
    const firstLineLower = firstLine.toLowerCase();
    const hasHeaders = firstLineLower.includes('query') || 
                       firstLineLower.includes('page') || 
                       firstLineLower.includes('click') ||
                       firstLineLower.includes('impression') ||
                       firstLineLower.includes('ctr') ||
                       firstLineLower.includes('position');
    
    if (hasHeaders) {
      headers = firstLine.split(/\s{2,}|\t/).map(h => h.trim().toLowerCase());
      lines.shift();
    } else {
      headers = ['query', 'clicks', 'impressions', 'ctr', 'position'];
    }

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const match = line.match(/^(.+?)\s+(\d[\d,.]*)\s+(\d[\d,.]*)\s+([\d,.]+%?)\s+([\d,.]+)$/);
      
      if (match) {
        const obj = {};
        obj[headers[0] || 'query'] = match[1].trim();
        obj[headers[1] || 'clicks'] = match[2];
        obj[headers[2] || 'impressions'] = match[3];
        obj[headers[3] || 'ctr'] = match[4];
        obj[headers[4] || 'position'] = match[5];
        rows.push(obj);
      } else {
        const values = line.split(/\s{2,}|\t/).map(v => v.trim());
        if (values.length >= 2) {
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = values[i] || '';
          });
          rows.push(obj);
        }
      }
    }
  } else {
    headers = firstLine.split(delimiter).map(h => 
      h.trim().toLowerCase().replace(/"/g, '').replace(/^\uFEFF/, '')
    );
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      let values;
      if (delimiter === ',') {
        values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
      } else {
        values = line.split(delimiter);
      }
      
      const obj = {};
      headers.forEach((h, idx) => {
        let val = values[idx]?.replace(/"/g, '').trim() || '';
        obj[h] = val;
      });
      
      if (Object.values(obj).some(v => v && v.length > 0)) {
        rows.push(obj);
      }
    }
  }

  // Normalize headers
  const normalizedRows = rows.map(row => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      let normalKey = key;
      if (key.includes('query') || key.includes('top queries')) normalKey = 'query';
      if (key.includes('page') || key.includes('top pages') || key.includes('url')) normalKey = 'page';
      if (key.includes('click')) normalKey = 'clicks';
      if (key.includes('impression')) normalKey = 'impressions';
      if (key.includes('ctr')) normalKey = 'ctr';
      if (key.includes('position')) normalKey = 'position';
      normalized[normalKey] = value;
    }
    return normalized;
  });

  if (normalizedRows.length === 0) {
    return { 
      error: 'Nessuna riga valida trovata. Prova a esportare i dati come file (CSV/TSV) invece di copiarli dalla tabella.', 
      rows: [] 
    };
  }

  return { headers, rows: normalizedRows };
}

// Helper functions
function parseNumber(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  let str = val.toString().trim();
  str = str.replace('%', '');
  
  if (str.match(/,\d{3}($|\D)/)) {
    str = str.replace(/,/g, '');
  } else if (str.match(/\.\d{3}($|\D)/)) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else {
    str = str.replace(',', '.');
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parsePercent(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  let str = val.toString().trim().replace('%', '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Analyze query performance data
 */
export function analyzeQueryPerformance(data) {
  const { rows, error } = parseGSCData(data);
  if (error) return { error };
  if (rows.length === 0) return { error: 'Nessun dato valido' };

  const withMetrics = rows.map(r => ({
    query: r.query || '',
    clicks: parseNumber(r.clicks),
    impressions: parseNumber(r.impressions),
    ctr: parsePercent(r.ctr),
    position: parseNumber(r.position)
  })).filter(r => r.query && r.impressions > 0);

  if (withMetrics.length === 0) {
    return { error: 'Nessuna query con dati validi trovata' };
  }

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
  const { rows, error } = parseGSCData(data);
  if (error) return { error };
  if (rows.length === 0) return { error: 'Nessun dato valido' };

  const withMetrics = rows.map(r => ({
    page: r.page || r.url || '',
    clicks: parseNumber(r.clicks),
    impressions: parseNumber(r.impressions),
    ctr: parsePercent(r.ctr),
    position: parseNumber(r.position)
  })).filter(r => r.page && r.impressions > 0);

  if (withMetrics.length === 0) {
    return { error: 'Nessuna pagina con dati validi trovata' };
  }

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
      topPages[0] ? `🏆 Top page: **${topPages[0].page.split('/').pop() || topPages[0].page}** con ${topPages[0].clicks} click` : null
    ].filter(Boolean),
    data: { topPages, underperforming, breakdown: { productPages: productPages.length, collectionPages: collectionPages.length, blogPages: blogPages.length } }
  };
}

/**
 * Analyze quick wins (keywords in positions 11-20)
 */
export function analyzeQuickWins(data) {
  const { rows, error } = parseGSCData(data);
  if (error) return { error };
  if (rows.length === 0) return { error: 'Nessun dato valido' };

  const withMetrics = rows.map(r => ({
    query: r.query || '',
    clicks: parseNumber(r.clicks),
    impressions: parseNumber(r.impressions),
    position: parseNumber(r.position)
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
  const { rows, error } = parseGSCData(data);
  if (error) return { error };
  if (rows.length === 0) return { error: 'Nessun dato valido' };

  const withMetrics = rows.map(r => ({
    query: r.query || '',
    clicks: parseNumber(r.clicks),
    impressions: parseNumber(r.impressions),
    ctr: parsePercent(r.ctr),
    position: parseNumber(r.position)
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
      const { rows, error } = parseGSCData(data);
      if (error) return { error };
      return {
        summary: { rows: rows.length },
        insights: [`📊 Ricevuti ${rows.length} righe di dati`],
        data: { raw: rows.slice(0, 20) }
      };
  }
}
