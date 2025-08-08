#!/usr/bin/env node

/**
 * GitHub Dependents Analyzer
 *
 * This script compares a JSON repository list with GitHub's dependents API
 * to identify missing repositories and optionally create PRs to add them.
 *
 * Usage:
 *   node src/github-dependents-analyzer.js [options]
 *
 * Options:
 *   --json-url <url>     URL to JSON file (default: PatternFly Analytics repos.json)
 *   --repo-url <url>     GitHub repository to analyze (default: patternfly/chatbot)
 *   --create-pr          Create a pull request with missing dependents
 *   --help               Show help
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs-extra');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  repoUrl: 'https://github.com/patternfly/chatbot/',
  createPr: false,
};

/**
 * Parse command line arguments
 * @returns {Object} Parsed configuration
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--repo-url':
        config.repoUrl = args[++i];
        break;
      case '--create-pr':
        config.createPr = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        showHelp();
        process.exit(1);
    }
  }

  return config;
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
GitHub Dependents Analyzer

Usage: node src/github-dependents-analyzer.js [options]

Options:
  --repo-url <url>     GitHub repository URL to analyze dependents for
                       Default: ${DEFAULT_CONFIG.repoUrl}
  --create-pr          Create a pull request to add missing dependents
  --help               Show this help message

Environment Variables:
  GITHUB_TOKEN         GitHub personal access token (required for --create-pr)

Examples:
  # Basic analysis (analyzes chatbot dependents against local repos.json)
  node src/github-dependents-analyzer.js

  # Custom repository analysis
  node src/github-dependents-analyzer.js --repo-url https://github.com/patternfly/patternfly-react

  # Create PR with missing dependents
  GITHUB_TOKEN=your_token node src/github-dependents-analyzer.js --create-pr
  `);
}

/**
 * Parse GitHub repository URL to extract owner and repo name
 * @param {string} repoUrl - GitHub repository URL
 * @returns {Object} Object with owner and repo properties
 */
function parseRepoUrl(repoUrl) {
  const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(urlPattern);

  if (!match) {
    throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''), // Remove .git suffix if present
  };
}

/**
 * Load local repository list from repos.json
 * @returns {Promise<Array>} Array of repository objects
 */
async function loadLocalRepoList() {
  try {
    // Try multiple possible locations for repos.json
    const possiblePaths = [
      path.resolve(__dirname, '../..', 'repos.json'), // From src/ subdirectory
      path.resolve(process.cwd(), 'repos.json'), // From current working directory
      path.resolve(__dirname, '..', 'repos.json'), // One level up from src/
      path.resolve(__dirname, 'repos.json'), // Same directory as script
    ];

    let reposPath = null;
    for (const possiblePath of possiblePaths) {
      if (await fs.pathExists(possiblePath)) {
        reposPath = possiblePath;
        break;
      }
    }

    if (!reposPath) {
      console.log(`📍 Searched in these locations:`);
      possiblePaths.forEach((p) => console.log(`   - ${p}`));
      throw new Error(`Repository file not found in any expected location`);
    }

    console.log(`📥 Loading repository list from: ${reposPath}`);

    const data = await fs.readJson(reposPath);

    // Handle both direct array and object with repos property
    const repos = Array.isArray(data) ? data : data.repos;

    if (!Array.isArray(repos)) {
      throw new Error(
        'repos.json file does not contain a valid repository array'
      );
    }

    console.log(`✅ Found ${repos.length} repositories in local repos.json`);
    return repos;
  } catch (error) {
    console.error(`❌ Error loading repository list: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch GitHub dependents using web scraping (GitHub doesn't provide a direct API)
 * @param {Octokit} octokit - Authenticated Octokit instance (for additional API calls)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Array>} Array of dependent repositories
 */
async function fetchGitHubDependents(octokit, owner, repo) {
  try {
    console.log(
      `🔍 Fetching dependents for ${owner}/${repo} from GitHub web interface...`
    );
    console.log(
      `ℹ️  Note: GitHub doesn't provide a direct API for dependents, using web scraping`
    );

    const dependentsUrl = `https://github.com/${owner}/${repo}/network/dependents`;

    // Fetch the dependents page
    const response = await fetch(dependentsUrl, {
      headers: {
        'User-Agent': 'patternfly-analytics-dependents-analyzer/1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Parse the HTML to extract repository information
    const dependents = parseGitHubDependentsHTML(html);

    // Enhance with additional repository details from API
    console.log(
      `🔄 Enhancing ${dependents.length} dependents with API data...`
    );
    const enhancedDependents = await enhanceDependentsWithApiData(
      octokit,
      dependents
    );

    console.log(`✅ Found ${enhancedDependents.length} dependents on GitHub`);
    return enhancedDependents;
  } catch (error) {
    if (error.message.includes('404')) {
      console.error(
        `❌ Repository ${owner}/${repo} not found or no dependents page available`
      );
    } else if (error.message.includes('403')) {
      console.error(`❌ Rate limit exceeded or insufficient permissions`);
    } else {
      console.error(`❌ Error fetching GitHub dependents: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse GitHub dependents HTML page to extract repository information
 * @param {string} html - HTML content from GitHub dependents page
 * @returns {Array} Array of basic repository information
 */
function parseGitHubDependentsHTML(html) {
  const dependents = [];

  // Use regex to find repository links in the dependents page
  // GitHub uses specific patterns like: /owner/repo in data-hovercard-url attributes
  const repoLinkPattern =
    /data-hovercard-url="\/([^\/]+)\/([^\/]+)\/hovercard"/g;
  const titlePattern =
    /<span[^>]*class="[^"]*text-bold[^"]*"[^>]*>([^<]+)<\/span>/g;

  let match;
  const seenRepos = new Set();

  while ((match = repoLinkPattern.exec(html)) !== null) {
    const owner = match[1];
    const repo = match[2];
    const fullName = `${owner}/${repo}`;

    // Skip duplicates and invalid entries
    if (
      seenRepos.has(fullName) ||
      ['github', 'users', 'orgs'].includes(owner) ||
      repo.includes('?')
    ) {
      continue;
    }

    seenRepos.add(fullName);

    dependents.push({
      owner,
      name: repo,
      full_name: fullName,
      html_url: `https://github.com/${fullName}`,
    });
  }

  return dependents;
}

/**
 * Enhance basic dependent info with GitHub API data
 * @param {Octokit} octokit - Authenticated Octokit instance
 * @param {Array} basicDependents - Basic repository information
 * @returns {Promise<Array>} Enhanced repository information
 */
async function enhanceDependentsWithApiData(octokit, basicDependents) {
  const enhanced = [];
  const batchSize = 5; // Process in small batches to avoid rate limiting

  for (let i = 0; i < basicDependents.length; i += batchSize) {
    const batch = basicDependents.slice(i, i + batchSize);

    const batchPromises = batch.map(async (dep) => {
      try {
        const response = await octokit.rest.repos.get({
          owner: dep.owner,
          repo: dep.name,
        });

        return {
          ...dep,
          description: response.data.description,
          language: response.data.language,
          stargazers_count: response.data.stargazers_count,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at,
          private: response.data.private,
        };
      } catch (error) {
        // If we can't get API data for this repo, return basic info
        console.warn(
          `⚠️  Could not fetch API data for ${dep.full_name}: ${error.message}`
        );
        return {
          ...dep,
          description: 'No description available',
          language: 'Unknown',
          stargazers_count: 0,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    enhanced.push(...batchResults);

    // Rate limiting protection between batches
    if (i + batchSize < basicDependents.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return enhanced;
}

/**
 * Compare repository lists and find missing dependents
 * @param {Array} jsonRepos - Repositories from JSON file
 * @param {Array} githubDependents - Dependents from GitHub API
 * @returns {Array} Array of missing dependent repositories
 */
function findMissingDependents(jsonRepos, githubDependents) {
  console.log(`🔄 Comparing repository lists...`);

  // Create a set of repository URLs from the JSON file for fast lookup
  const jsonRepoUrls = new Set(
    jsonRepos.map((repo) => {
      // Normalize URLs to handle various formats
      let url = repo.git || repo.url || repo.html_url || '';
      return url
        .toLowerCase()
        .replace(/\.git$/, '')
        .replace(/\/$/, '');
    })
  );

  // Find GitHub dependents not in the JSON list
  const missingDependents = githubDependents.filter((dependent) => {
    const dependentUrl = dependent.html_url.toLowerCase().replace(/\/$/, '');
    return !jsonRepoUrls.has(dependentUrl);
  });

  console.log(`📊 Analysis complete:`);
  console.log(`   • JSON repositories: ${jsonRepos.length}`);
  console.log(`   • GitHub dependents: ${githubDependents.length}`);
  console.log(`   • Missing dependents: ${missingDependents.length}`);

  return missingDependents;
}

/**
 * Display missing dependents in a formatted list
 * @param {Array} missingDependents - Array of missing dependent repositories
 */
function displayMissingDependents(missingDependents) {
  if (missingDependents.length === 0) {
    console.log(
      `\n🎉 No missing dependents found! All GitHub dependents are already in the JSON file.`
    );
    return;
  }

  console.log(`\n📋 Missing Dependents (${missingDependents.length}):`);
  console.log('='.repeat(50));

  missingDependents.forEach((repo, index) => {
    console.log(`${index + 1}. ${repo.full_name}`);
    console.log(`   URL: ${repo.html_url}`);
    console.log(`   Description: ${repo.description || 'No description'}`);
    console.log(`   Stars: ${repo.stargazers_count || 0}`);
    console.log(`   Created: ${repo.created_at || 'Unknown'}`);
    console.log(`   Updated: ${repo.updated_at || 'Unknown'}`);
    console.log('');
  });
}

/**
 * Generate updated JSON content with missing dependents
 * @param {Array} originalRepos - Original repository list
 * @param {Array} missingDependents - Missing dependent repositories
 * @returns {string} Updated JSON content
 */
function generateUpdatedJson(originalRepos, missingDependents) {
  // Convert GitHub dependents to the expected JSON format
  const newRepos = missingDependents.map((repo) => ({
    git: repo.html_url,
    name: repo.full_name.replace('/', '-'),
  }));

  // Combine original repos with new ones
  const updatedRepos = [...originalRepos, ...newRepos];

  // Sort by name for consistency
  updatedRepos.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return JSON.stringify({ repos: updatedRepos }, null, 2);
}

/**
 * Update local repos.json file with missing dependents
 * @param {Array} originalRepos - Original repository list
 * @param {Array} missingDependents - Missing dependent repositories
 */
async function updateLocalReposFile(originalRepos, missingDependents) {
  try {
    console.log(`\n📝 Updating local repos.json file...`);

    // Use the same path resolution logic as loadLocalRepoList
    const possiblePaths = [
      path.resolve(__dirname, '../..', 'repos.json'),
      path.resolve(process.cwd(), 'repos.json'),
      path.resolve(__dirname, '..', 'repos.json'),
      path.resolve(__dirname, 'repos.json'),
    ];

    let reposPath = null;
    for (const possiblePath of possiblePaths) {
      if (await fs.pathExists(possiblePath)) {
        reposPath = possiblePath;
        break;
      }
    }

    if (!reposPath) {
      throw new Error(`Repository file not found for updating`);
    }

    const backupPath = `${reposPath}.backup.${Date.now()}`;

    // Create backup of original file
    await fs.copy(reposPath, backupPath);
    console.log(`📋 Created backup: ${path.basename(backupPath)}`);

    // Generate updated content
    const updatedContent = generateUpdatedJson(
      originalRepos,
      missingDependents
    );

    // Write updated content
    await fs.writeFile(reposPath, updatedContent);

    console.log(
      `✅ Updated repos.json with ${missingDependents.length} new repositories`
    );
    console.log(`   Backup saved as: ${path.basename(backupPath)}`);
  } catch (error) {
    console.error(`❌ Error updating repos.json: ${error.message}`);
    throw error;
  }
}

/**
 * Create a pull request with missing dependents
 * @param {Octokit} octokit - Authenticated Octokit instance
 * @param {Array} originalRepos - Original repository list
 * @param {Array} missingDependents - Missing dependent repositories
 */
async function createPullRequest(octokit, originalRepos, missingDependents) {
  try {
    console.log(`\n🚀 Creating pull request...`);

    // Determine target repository from git remote
    let targetOwner, targetRepo, branch;

    try {
      const { execSync } = require('child_process');
      const remoteUrl = execSync('git remote get-url origin', {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf8',
      }).trim();
      const match = remoteUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);

      if (match) {
        targetOwner = match[1];
        targetRepo = match[2];
      } else {
        throw new Error('Could not parse git remote');
      }

      // Get current branch
      branch =
        execSync('git branch --show-current', {
          cwd: path.resolve(__dirname, '../..'),
          encoding: 'utf8',
        }).trim() || 'main';
    } catch (gitError) {
      console.warn(
        `⚠️  Could not determine git repository info: ${gitError.message}`
      );
      console.log(`   Using fallback: updating local file only`);
      await updateLocalReposFile(originalRepos, missingDependents);
      return;
    }

    const newBranch = `add-missing-dependents-${Date.now()}`;

    // Get the current file content and SHA
    const fileResponse = await octokit.rest.repos.getContent({
      owner: targetOwner,
      repo: targetRepo,
      path: 'repos.json',
      ref: branch,
    });

    const currentSha = fileResponse.data.sha;

    // Create new branch
    const branchResponse = await octokit.rest.git.getRef({
      owner: targetOwner,
      repo: targetRepo,
      ref: `heads/${branch}`,
    });

    await octokit.rest.git.createRef({
      owner: targetOwner,
      repo: targetRepo,
      ref: `refs/heads/${newBranch}`,
      sha: branchResponse.data.object.sha,
    });

    // Update the file content
    const updatedContent = generateUpdatedJson(
      originalRepos,
      missingDependents
    );

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: targetOwner,
      repo: targetRepo,
      path: 'repos.json',
      message: `chore: add ${
        missingDependents.length
      } missing GitHub dependents\n\nAdded repositories:\n${missingDependents
        .map((repo) => `- ${repo.full_name}`)
        .join('\n')}`,
      content: Buffer.from(updatedContent).toString('base64'),
      branch: newBranch,
      sha: currentSha,
    });

    // Create pull request
    const prResponse = await octokit.rest.pulls.create({
      owner: targetOwner,
      repo: targetRepo,
      title: `Add ${missingDependents.length} missing GitHub dependents`,
      head: newBranch,
      base: branch,
      body: `## Summary

This PR adds ${
        missingDependents.length
      } repositories that appear as dependents on GitHub but are missing from our \`repos.json\` file.

## Added Repositories

${missingDependents
  .map(
    (repo) =>
      `- [${repo.full_name}](${repo.html_url}) - ${
        repo.description || 'No description'
      }`
  )
  .join('\n')}

## Verification

These repositories were identified by comparing GitHub's dependents API with our current repository list.

Generated by: GitHub Dependents Analyzer`,
    });

    console.log(`✅ Pull request created successfully!`);
    console.log(`   URL: ${prResponse.data.html_url}`);
    console.log(`   Number: #${prResponse.data.number}`);
  } catch (error) {
    console.error(`❌ Error creating pull request: ${error.message}`);

    if (error.status === 403) {
      console.error(`   Make sure your GitHub token has 'repo' permissions`);
    } else if (error.status === 404) {
      console.error(`   Repository not found or insufficient permissions`);
    }

    // Fallback to local file update
    console.log(`   Falling back to local file update...`);
    await updateLocalReposFile(originalRepos, missingDependents);
  }
}

/**
 * Initialize Octokit with authentication
 * @param {boolean} requireAuth - Whether authentication is required
 * @returns {Octokit} Configured Octokit instance
 */
function initializeOctokit(requireAuth = false) {
  const token = process.env.GITHUB_TOKEN;

  if (requireAuth && !token) {
    console.error(`❌ GitHub token required for this operation`);
    console.error(
      `   Set GITHUB_TOKEN environment variable with your personal access token`
    );
    console.error(
      `   Token permissions needed: repo (for PR creation), public_repo (for reading)`
    );
    process.exit(1);
  }

  const config = {
    userAgent: 'patternfly-analytics-dependents-analyzer/1.0.0',
  };

  if (token) {
    config.auth = token;
  }

  return new Octokit(config);
}

/**
 * Main execution function
 */
async function main() {
  try {
    const config = parseArguments();
    const { owner, repo } = parseRepoUrl(config.repoUrl);

    console.log(`🔧 Configuration:`);
    console.log(`   Repository: ${owner}/${repo}`);
    console.log(`   Create PR: ${config.createPr ? 'Yes' : 'No'}`);
    console.log('');

    // Initialize GitHub API client
    const octokit = initializeOctokit(config.createPr);

    // Fetch data from both sources
    const [jsonRepos, githubDependents] = await Promise.all([
      loadLocalRepoList(),
      fetchGitHubDependents(octokit, owner, repo),
    ]);

    // Compare and find missing dependents
    const missingDependents = findMissingDependents(
      jsonRepos,
      githubDependents
    );

    // Display results
    displayMissingDependents(missingDependents);

    // Create PR if requested and there are missing dependents
    if (config.createPr && missingDependents.length > 0) {
      await createPullRequest(octokit, jsonRepos, missingDependents);
    } else if (config.createPr && missingDependents.length === 0) {
      console.log(
        `\n✅ No pull request needed - all dependents are already tracked`
      );
    }
  } catch (error) {
    console.error(`\n💥 Application error: ${error.message}`);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
}

module.exports = {
  parseRepoUrl,
  loadLocalRepoList,
  fetchGitHubDependents,
  parseGitHubDependentsHTML,
  enhanceDependentsWithApiData,
  findMissingDependents,
  generateUpdatedJson,
  updateLocalReposFile,
  parseArguments,
};
