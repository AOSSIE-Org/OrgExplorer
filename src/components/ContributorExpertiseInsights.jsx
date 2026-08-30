import React, { useMemo } from 'react';
import { 
  analyzeExpertise, 
  generateInsights, 
  hasSufficientData,
  getContributionSummary 
} from '../utils/contributorExpertise';
import { FiInfo, FiAlertCircle } from 'react-icons/fi';

const ExpertiseLevelBadge = ({ level }) => {
  const styles = {
    HIGH: {
      background: 'rgba(34, 197, 94, 0.12)',
      color: '#22c55e',
      border: '1px solid rgba(34, 197, 94, 0.2)'
    },
    MEDIUM: {
      background: 'rgba(251, 191, 36, 0.12)',
      color: '#d97706',
      border: '1px solid rgba(251, 191, 36, 0.2)'
    },
    LOW: {
      background: 'rgba(107, 114, 128, 0.12)',
      color: '#6b7280',
      border: '1px solid rgba(107, 114, 128, 0.15)'
    }
  };

  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      ...styles[level]
    }}>
      {level}
    </span>
  );
};

const ExpertiseBar = ({ score, maxScore }) => {
  const percentage = Math.min(100, (score / maxScore) * 100);
  return (
    <div style={{
      width: 60,
      height: 3,
      background: 'var(--border)',
      borderRadius: 2,
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${percentage}%`,
        height: '100%',
        background: 'var(--accent)',
        borderRadius: 2,
        transition: 'width 0.3s ease'
      }} />
    </div>
  );
};

const ContributorExpertiseInsights = ({ contributions }) => {
  const { expertise, insights, hasData, summary } = useMemo(() => {
    if (!contributions || contributions.length === 0) {
      return {
        expertise: [],
        insights: ['No contribution data available for analysis.'],
        hasData: false,
        summary: { total: 0, prs: 0, issues: 0, repos: [] }
      };
    }

    const expertiseData = analyzeExpertise(contributions);
    const insightsData = generateInsights(contributions, expertiseData);
    const summaryData = getContributionSummary(contributions);
    const sufficient = hasSufficientData(contributions, 3);

    return {
      expertise: expertiseData,
      insights: sufficient ? insightsData : ['Insufficient data to generate reliable insights. Need at least 3 contributions.'],
      hasData: sufficient,
      summary: summaryData
    };
  }, [contributions]);

  if (!contributions || contributions.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        padding: '40px 24px',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16
      }}>
        <FiAlertCircle size={32} style={{ color: 'var(--text2)', marginBottom: 12 }} />
        <p style={{ color: 'var(--text2)', fontSize: 14, fontWeight: 500 }}>
          No Contributions Found
        </p>
        <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>
          Contributions will appear here once the contributor makes PRs or issues.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 12,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      marginTop: 16,
      marginBottom: 16
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🧠</span>
          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text)',
            margin: 0
          }}>
            Contributor Expertise & Insights
          </h3>
          {summary.total > 0 && (
            <span style={{
              fontSize: 11,
              padding: '2px 10px',
              borderRadius: 12,
              background: 'var(--border)',
              color: 'var(--text2)',
              fontWeight: 500
            }}>
              {summary.total} contributions • {summary.uniqueRepos} repos
            </span>
          )}
        </div>
      </div>

      <div style={{
        padding: '20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24
      }}>
        <div>
          <h4 style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text2)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            letterSpacing: '0.02em'
          }}>
            <span style={{ fontSize: 16 }}>🎯</span> Areas of Expertise
          </h4>
          
          {!hasData ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'var(--bg)',
              borderRadius: 6,
              color: 'var(--text2)',
              fontSize: 13,
              border: '1px dashed var(--border)'
            }}>
              <FiInfo size={16} style={{ marginRight: 8, flexShrink: 0 }} />
              <span>Not enough data to determine expertise. More contributions needed.</span>
            </div>
          ) : expertise.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'var(--bg)',
              borderRadius: 6,
              color: 'var(--text2)',
              fontSize: 13,
              border: '1px dashed var(--border)'
            }}>
              <FiInfo size={16} style={{ marginRight: 8, flexShrink: 0 }} />
              <span>No clear expertise identified from available contributions.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {expertise.map((item, index) => {
                const maxScore = expertise[0]?.score || 1;
                return (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid var(--border)',
                    borderBottomWidth: '1px',
                    borderBottomStyle: 'solid',
                    borderBottomColor: 'var(--border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{item.icon}</span>
                      <span style={{
                        fontSize: 13,
                        color: 'var(--text)',
                        fontWeight: 500
                      }}>
                        {item.area}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ExpertiseBar score={item.score} maxScore={maxScore} />
                      <ExpertiseLevelBadge level={item.level} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text2)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            letterSpacing: '0.02em'
          }}>
            <span style={{ fontSize: 16 }}>💡</span> Contribution Insights
          </h4>
          
          {insights.length === 0 || (insights.length === 1 && insights[0].includes('No contribution')) ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'var(--bg)',
              borderRadius: 6,
              color: 'var(--text2)',
              fontSize: 13,
              border: '1px dashed var(--border)'
            }}>
              <FiInfo size={16} style={{ marginRight: 8, flexShrink: 0 }} />
              <span>{insights[0] || 'No insights available.'}</span>
            </div>
          ) : (
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {insights.map((insight, index) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '6px 0',
                  fontSize: 13,
                  color: 'var(--text)',
                  lineHeight: 1.5,
                  borderBottom: '1px solid var(--border)',
                  borderBottomWidth: '1px',
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'var(--border)'
                }}>
                  <span style={{
                    color: 'var(--accent)',
                    fontWeight: 700,
                    flexShrink: 0,
                    fontSize: 16
                  }}>•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{
        padding: '8px 20px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)'
      }}>
        <span style={{
          fontSize: 11,
          color: 'var(--text3)'
        }}>
          Based on {summary.total} contribution{summary.total > 1 ? 's' : ''} from the selected period
        </span>
      </div>
    </div>
  );
};

export default ContributorExpertiseInsights;