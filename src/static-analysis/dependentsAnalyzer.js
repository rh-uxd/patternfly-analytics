/**
 * Dependents Analyzer Integration Module
 * 
 * This module integrates GitHub dependents analysis into the main collection process.
 * It analyzes all PatternFly packages and saves organized results to the stats output directory.
 */

const path = require('path');
const fs = require('fs-extra');
// Import functions from the github-dependents-analyzer module
// We'll need to import them individually and handle the integration
const dependentsAnalyzer = require('../github-dependents-analyzer');

// List of PatternFly packages to analyze
const PATTERNFLY_PACKAGES = [
  'patternfly/patternfly',
  'patternfly/patternfly-react',
  'patternfly/patternfly-elements',
  'patternfly/patternfly-org',
  'patternfly/patternfly-design-tokens',
  'patternfly/patternfly-toolkit',
  'patternfly/patternfly-quickstarts',
  'patternfly/react-charts',
  'patternfly/react-topology',
  'patternfly/react-table',
  'patternfly/react-code-editor',
  'patternfly/react-console',
  'patternfly/react-user-feedback',
  'patternfly/react-catalog-view-extension',
  'patternfly/react-log-viewer',
  'patternfly/react-virtualized-extension',
  'patternfly/chatbot'
];

/**
 * Analyze dependents for a single PatternFly package
 * @param {Octokit} octokit - GitHub API client
 * @param {Array} localRepos - Local repository list
 * @param {string} packageRepo - Repository in format 'owner/repo'
 * @returns {Promise<Object>} Analysis result for the package
 */
async function analyzePackageDependents(octokit, localRepos, packageRepo) {
  try {
    console.log(`\n🔍 Analyzing dependents for ${packageRepo}...`);
    
    const [owner, repo] = packageRepo.split('/');
    
    // Fetch GitHub dependents
    const githubDependents = await dependentsAnalyzer.fetchGitHubDependents(octokit, owner, repo);
    
    // Find missing dependents
    const missingDependents = dependentsAnalyzer.findMissingDependents(localRepos, githubDependents);
    
    // Filter out obvious non-repositories (users, orgs pages)
    const filteredMissing = missingDependents.filter(dep => {
      const isUserOrOrgPage = dep.full_name.startsWith('users/') || 
                             dep.full_name.startsWith('orgs/') ||
                             dep.owner === 'users' ||
                             dep.owner === 'orgs';
      return !isUserOrOrgPage;
    });
    
    console.log(`✅ ${packageRepo}: Found ${githubDependents.length} total dependents, ${filteredMissing.length} missing from tracking`);
    
    return {
      package: packageRepo,
      analysis_date: new Date().toISOString(),
      total_dependents: githubDependents.length,
      tracked_dependents: githubDependents.length - filteredMissing.length,
      missing_dependents_count: filteredMissing.length,
      all_dependents: githubDependents,
      missing_dependents: filteredMissing,
      suggested_additions: filteredMissing.map(dep => ({
        git: dep.html_url,
        name: dep.full_name.replace('/', '-'),
        full_name: dep.full_name,
        description: dep.description || 'No description',
        language: dep.language || 'Unknown',
        stars: dep.stargazers_count || 0,
        last_updated: dep.updated_at,
        reason: `Depends on ${packageRepo}`
      }))
    };
    
  } catch (error) {
    console.warn(`⚠️  Error analyzing ${packageRepo}: ${error.message}`);
    return {
      package: packageRepo,
      analysis_date: new Date().toISOString(),
      error: error.message,
      total_dependents: 0,
      tracked_dependents: 0,
      missing_dependents_count: 0,
      all_dependents: [],
      missing_dependents: [],
      suggested_additions: []
    };
  }
}

/**
 * Run dependents analysis for all PatternFly packages
 * @param {string} outputDir - Directory to save results
 * @returns {Promise<Object>} Complete analysis results
 */
async function runDependentsAnalysis(outputDir) {
  console.log(`\n🚀 Starting dependents analysis for ${PATTERNFLY_PACKAGES.length} PatternFly packages...`);
  
  try {
    // Initialize GitHub client (non-authenticated for read operations)
    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({
      userAgent: 'patternfly-analytics-dependents-analyzer/1.0.0'
    });
    
    // Load local repository list
    const localRepos = await dependentsAnalyzer.loadLocalRepoList();
    
    // Analyze each package with rate limiting
    const results = [];
    const batchSize = 3; // Process packages in smaller batches to avoid rate limits
    
    for (let i = 0; i < PATTERNFLY_PACKAGES.length; i += batchSize) {
      const batch = PATTERNFLY_PACKAGES.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(PATTERNFLY_PACKAGES.length/batchSize)}: ${batch.join(', ')}`);
      
      const batchPromises = batch.map(pkg => 
        analyzePackageDependents(octokit, localRepos, pkg)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting protection between batches
      if (i + batchSize < PATTERNFLY_PACKAGES.length) {
        console.log(`⏳ Waiting 30 seconds before next batch to respect rate limits...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    // Compile comprehensive results
    const analysis = {
      metadata: {
        analysis_date: new Date().toISOString(),
        packages_analyzed: PATTERNFLY_PACKAGES.length,
        local_repos_count: localRepos.length,
        total_execution_time: new Date().toISOString()
      },
      summary: {
        total_unique_dependents: new Set(
          results.flatMap(r => r.all_dependents.map(d => d.full_name))
        ).size,
        total_missing_dependents: results.reduce((sum, r) => sum + r.missing_dependents_count, 0),
        packages_with_missing_dependents: results.filter(r => r.missing_dependents_count > 0).length
      },
      by_package: results.reduce((acc, result) => {
        acc[result.package] = result;
        return acc;
      }, {}),
      consolidated_suggestions: consolidateSuggestions(results)
    };
    
    // Save results to output directory
    await saveAnalysisResults(outputDir, analysis);
    
    console.log(`\n✅ Dependents analysis complete!`);
    console.log(`   📊 Total unique dependents found: ${analysis.summary.total_unique_dependents}`);
    console.log(`   📋 Total missing dependents: ${analysis.summary.total_missing_dependents}`);
    console.log(`   📦 Packages with missing dependents: ${analysis.summary.packages_with_missing_dependents}/${PATTERNFLY_PACKAGES.length}`);
    console.log(`   💾 Results saved to: ${outputDir}`);
    
    return analysis;
    
  } catch (error) {
    console.error(`❌ Error during dependents analysis: ${error.message}`);
    throw error;
  }
}

/**
 * Consolidate suggestions from all packages to avoid duplicates
 * @param {Array} results - Analysis results from all packages
 * @returns {Array} Consolidated list of suggested repositories
 */
function consolidateSuggestions(results) {
  const suggestions = new Map();
  
  results.forEach(result => {
    result.suggested_additions.forEach(suggestion => {
      const key = suggestion.full_name;
      
      if (suggestions.has(key)) {
        // Add this package to the list of reasons
        const existing = suggestions.get(key);
        existing.reasons.push(suggestion.reason);
        existing.dependent_packages.push(result.package);
      } else {
        // New suggestion
        suggestions.set(key, {
          ...suggestion,
          reasons: [suggestion.reason],
          dependent_packages: [result.package],
          priority_score: calculatePriorityScore(suggestion)
        });
      }
    });
  });
  
  // Convert to array and sort by priority
  return Array.from(suggestions.values()).sort((a, b) => b.priority_score - a.priority_score);
}

/**
 * Calculate priority score for a suggested repository
 * @param {Object} suggestion - Repository suggestion
 * @returns {number} Priority score (higher = more important)
 */
function calculatePriorityScore(suggestion) {
  let score = 0;
  
  // Star count contributes significantly
  score += (suggestion.stars || 0) * 10;
  
  // Language type bonus
  if (['TypeScript', 'JavaScript', 'React'].includes(suggestion.language)) {
    score += 100;
  }
  
  // Recent activity bonus
  if (suggestion.last_updated) {
    const daysSinceUpdate = (Date.now() - new Date(suggestion.last_updated)) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 50;
    else if (daysSinceUpdate < 90) score += 25;
  }
  
  // Description quality bonus
  if (suggestion.description && suggestion.description !== 'No description' && suggestion.description.length > 20) {
    score += 25;
  }
  
  // Official-looking repositories bonus
  if (suggestion.full_name.includes('redhat') || 
      suggestion.full_name.includes('openshift') ||
      suggestion.full_name.includes('console') ||
      suggestion.full_name.includes('ui')) {
    score += 75;
  }
  
  return score;
}

/**
 * Save analysis results to the output directory
 * @param {string} outputDir - Directory to save results
 * @param {Object} analysis - Complete analysis results
 */
async function saveAnalysisResults(outputDir, analysis) {
  // Ensure output directory exists
  await fs.ensureDir(outputDir);
  
  const timestamp = new Date().toISOString().substring(0, 10);
  
  // Save comprehensive results
  const mainResultsPath = path.join(outputDir, '_dependents_analysis.json');
  await fs.writeJson(mainResultsPath, analysis, { spaces: 2 });
  
  // Save consolidated suggestions for easy review
  const suggestionsPath = path.join(outputDir, '_suggested_repos.json');
  await fs.writeJson(suggestionsPath, {
    metadata: {
      generated_date: analysis.metadata.analysis_date,
      total_suggestions: analysis.consolidated_suggestions.length,
      analysis_summary: analysis.summary
    },
    suggested_repositories: analysis.consolidated_suggestions
  }, { spaces: 2 });
  
  // Save individual package summaries for debugging
  const packageSummariesPath = path.join(outputDir, '_dependents_by_package.json');
  const packageSummaries = {};
  Object.entries(analysis.by_package).forEach(([pkg, data]) => {
    packageSummaries[pkg] = {
      total_dependents: data.total_dependents,
      missing_count: data.missing_dependents_count,
      top_missing: data.missing_dependents.slice(0, 5).map(d => ({
        name: d.full_name,
        stars: d.stargazers_count,
        language: d.language
      }))
    };
  });
  await fs.writeJson(packageSummariesPath, packageSummaries, { spaces: 2 });
  
  console.log(`💾 Saved analysis files:`);
  console.log(`   📋 Complete analysis: ${path.basename(mainResultsPath)}`);
  console.log(`   🎯 Suggested repos: ${path.basename(suggestionsPath)}`);
  console.log(`   📦 Package summaries: ${path.basename(packageSummariesPath)}`);
}

module.exports = {
  runDependentsAnalysis,
  analyzePackageDependents,
  PATTERNFLY_PACKAGES,
  consolidateSuggestions,
  calculatePriorityScore
};