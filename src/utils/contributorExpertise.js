export const EXPERTISE_AREAS = {
  'AI / Machine Learning': {
    keywords: ['ai', 'ml', 'machine learning', 'deep learning', 'neural', 'tensorflow', 'pytorch', 'nlp', 'llm', 'openai', 'claude', 'gemini', 'llama', 'rag', 'embedding', 'vector', 'model', 'training', 'inference', 'transformer', 'bert', 'gpt'],
    icon: '🧠'
  },
  'Computer Vision': {
    keywords: ['vision', 'image', 'cv', 'opencv', 'detection', 'segmentation', 'classification', 'object detection', 'face', 'video', 'pixel', 'yolo', 'cnn', 'convolution', 'pose', 'landmark'],
    icon: '👁️'
  },
  'Frontend / UI': {
    keywords: ['ui', 'ux', 'frontend', 'react', 'component', 'style', 'css', 'html', 'design', 'responsive', 'web', 'angular', 'vue', 'tailwind', 'bootstrap', 'sass', 'interface'],
    icon: '🎨'
  },
  'Backend': {
    keywords: ['backend', 'server', 'api', 'database', 'sql', 'nosql', 'service', 'microservice', 'rest', 'graphql', 'node', 'python', 'java', 'go', 'rust', 'endpoint', 'middleware'],
    icon: '⚙️'
  },
  'APIs': {
    keywords: ['api', 'rest', 'graphql', 'endpoint', 'swagger', 'openapi', 'postman', 'http', 'request', 'response', 'json', 'xml', 'soap', 'webhook'],
    icon: '🔌'
  },
  'Testing': {
    keywords: ['test', 'unit test', 'integration', 'e2e', 'jest', 'cypress', 'pytest', 'mocha', 'coverage', 'qa', 'quality', 'assert', 'mock', 'selenium', 'junit'],
    icon: '✅'
  },
  'CI/CD': {
    keywords: ['ci', 'cd', 'deployment', 'pipeline', 'docker', 'kubernetes', 'github actions', 'jenkins', 'devops', 'infra', 'terraform', 'ansible', 'release', 'build', 'automation'],
    icon: '🚀'
  },
  'Documentation': {
    keywords: ['docs', 'documentation', 'readme', 'guide', 'tutorial', 'wiki', 'comment', 'example', 'getting started', 'install', 'usage', 'api docs', 'swagger'],
    icon: '📝'
  },
  'Security': {
    keywords: ['security', 'auth', 'authentication', 'encryption', 'vulnerability', 'penetration', 'cve', 'firewall', 'ssl', 'jwt', 'oauth', 'csrf', 'xss', 'injection', 'crypto'],
    icon: '🔒'
  },
  'Search / Embeddings': {
    keywords: ['search', 'embedding', 'vector', 'index', 'elasticsearch', 'solr', 'lucene', 'query', 'retrieval', 'ranking', 'similarity', 'cosine', 'faiss'],
    icon: '🔍'
  }
};

export const analyzeExpertise = (contributions) => {
  if (!contributions || contributions.length === 0) {
    return [];
  }

  const scores = {};
  Object.keys(EXPERTISE_AREAS).forEach(area => {
    scores[area] = 0;
  });

  contributions.forEach(contribution => {
    const text = [
      contribution.title || '',
      contribution.body || '',
      ...(contribution.labels || []).map(label => typeof label === 'string' ? label : label.name || ''),
      contribution.repository_url || '',
      contribution.type || ''
    ].join(' ').toLowerCase();

    Object.entries(EXPERTISE_AREAS).forEach(([area, data]) => {
      let areaScore = 0;
      
      data.keywords.forEach(keyword => {
        const regex = new RegExp(keyword.toLowerCase(), 'g');
        const matches = text.match(regex);
        
        if (matches) {
          const titleText = (contribution.title || '').toLowerCase();
          const titleMatches = titleText.match(regex) || [];
          const weight = titleMatches.length > 0 ? 2 : 1;
          areaScore += matches.length * weight;
        }
      });
      
      if (contribution.labels) {
        const labelText = contribution.labels.map(l => typeof l === 'string' ? l : l.name || '').join(' ').toLowerCase();
        const labelRegex = new RegExp(data.keywords.join('|'), 'g');
        const labelMatches = labelText.match(labelRegex) || [];
        areaScore += labelMatches.length * 1.5;
      }
      
      scores[area] += areaScore;
    });
  });

  const maxScore = Math.max(...Object.values(scores), 1);

  const result = Object.entries(scores)
    .map(([area, score]) => {
      const normalizedScore = score / maxScore;
      
      let level;
      if (normalizedScore >= 0.35) level = 'HIGH';
      else if (normalizedScore >= 0.15) level = 'MEDIUM';
      else if (normalizedScore >= 0.05) level = 'LOW';
      else level = null;
      
      return {
        area,
        score: Math.round(score * 100) / 100,
        normalizedScore: Math.round(normalizedScore * 100),
        level,
        icon: EXPERTISE_AREAS[area]?.icon || '📁'
      };
    })
    .filter(item => item.level !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return result;
};

export const generateInsights = (contributions, expertise) => {
  if (!contributions || contributions.length === 0) {
    return ['No contribution data available to generate insights.'];
  }

  const insights = [];
  const total = contributions.length;
  
  if (expertise.length > 0 && expertise[0].level === 'HIGH') {
    const primary = expertise[0].area;
    const secondary = expertise.length > 1 && expertise[1].level === 'HIGH' ? expertise[1].area : null;
    
    if (secondary) {
      insights.push(`Strong focus on ${primary} and ${secondary}.`);
    } else {
      insights.push(`Specializes primarily in ${primary}.`);
    }
  }

  let featureCount = 0;
  let bugFixCount = 0;
  let docCount = 0;

  contributions.forEach(c => {
    const text = `${c.title || ''} ${c.body || ''} ${(c.labels || []).map(l => typeof l === 'string' ? l : l.name || '').join(' ')}`.toLowerCase();
    
    if (text.includes('feature') || text.includes('enhancement') || text.includes('add') || 
        text.includes('implement') || text.includes('new')) {
      featureCount++;
    }
    
    if (text.includes('fix') || text.includes('bug') || text.includes('issue') || 
        text.includes('patch') || text.includes('resolve') || text.includes('repair')) {
      bugFixCount++;
    }
    
    if (text.includes('doc') || text.includes('readme') || text.includes('guide') || 
        text.includes('tutorial') || text.includes('documentation')) {
      docCount++;
    }
  });

  if (featureCount > total * 0.3 && featureCount > bugFixCount * 1.5) {
    insights.push('Primarily contributes new features and enhancements.');
  } else if (bugFixCount > total * 0.3 && bugFixCount > featureCount * 1.5) {
    insights.push('Specializes in bug fixes and issue resolution.');
  } else if (docCount > total * 0.25) {
    insights.push('Strong focus on documentation and knowledge sharing.');
  }

  const repoCounts = {};
  contributions.forEach(c => {
    if (c.repository_url) {
      const repoName = c.repository_url.split('/').pop() || 'unknown';
      repoCounts[repoName] = (repoCounts[repoName] || 0) + 1;
    }
  });

  const sortedRepos = Object.entries(repoCounts).sort((a, b) => b[1] - a[1]);
  
  if (sortedRepos.length === 1) {
    insights.push(`All contributions focused in ${sortedRepos[0][0]}.`);
  } else if (sortedRepos.length > 0 && sortedRepos[0][1] > total * 0.4) {
    const pct = Math.round((sortedRepos[0][1] / total) * 100);
    insights.push(`Concentrated in ${sortedRepos[0][0]} (${pct}% of contributions).`);
  }

  const now = new Date();
  const recentContribs = contributions.filter(c => {
    if (!c.created_at) return false;
    const date = new Date(c.created_at);
    const diffDays = (now - date) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  });

  if (recentContribs.length > 0 && recentContribs.length / total > 0.3) {
    insights.push('Recently active with consistent contribution pattern.');
  } else if (recentContribs.length === 0 && total > 5) {
    insights.push('Historically active but no recent contributions (30+ days).');
  }

  if (sortedRepos.length >= 3) {
    insights.push(`Active across ${sortedRepos.length} different repositories.`);
  }

  const hasReviews = contributions.some(c => c.type === 'review' || c.pull_request);
  if (hasReviews) {
    insights.push('Engages in code review and collaboration.');
  }

  return insights.slice(0, 5);
};

export const hasSufficientData = (contributions, minRequired = 3) => {
  return contributions && contributions.length >= minRequired;
};

export const getContributionSummary = (contributions) => {
  if (!contributions || contributions.length === 0) {
    return { total: 0, prs: 0, issues: 0, repos: [] };
  }

  const prs = contributions.filter(c => c.pull_request || c.type === 'pr' || c.html_url?.includes('/pull/'));
  const issues = contributions.filter(c => c.type === 'issue' || c.html_url?.includes('/issues/'));
  
  const repos = [];
  contributions.forEach(c => {
    if (c.repository_url) {
      const repoName = c.repository_url.split('/').pop() || 'unknown';
      if (!repos.includes(repoName)) repos.push(repoName);
    }
  });

  return {
    total: contributions.length,
    prs: prs.length,
    issues: issues.length,
    repos: repos,
    uniqueRepos: repos.length
  };
};