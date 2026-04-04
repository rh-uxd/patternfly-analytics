# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PatternFly Analytics is a tool that analyzes PatternFly usage across Red Hat products. It clones repositories, scans their source code for PatternFly imports and usage, and generates detailed analytics reports.

## Architecture

### Core Components

- **Static Analysis Pipeline** (`src/static-analysis/`): Main analysis engine that processes repositories
  - `cli.js`: Entry point that orchestrates the collection process
  - `getPatternflyStats.js`: Extracts PatternFly component usage statistics
  - `getPackageStats.js`: Analyzes package dependencies and versions
  - `getSortedImports.js`: Categorizes and sorts import usage data
  - `getDeprecatedComponents.js`: Identifies usage of deprecated components

- **HTML Analysis** (`src/html-analysis/`): Web crawling functionality for HTML-based analysis
  - `crawler.js`: Puppeteer-based web crawler
  - `aggregator.js`: Processes crawled data

### Data Flow

1. Repository list defined in `repos.json` 
2. `npm run collect` clones/updates repos in `/tmp` directory
3. Static analysis modules scan each repository's source code
4. Results written to `/stats-static/{YYYY-MM-DD}/` with multiple JSON output files
5. Python script `to_xls.py` converts JSON data to Excel reports

### Output Files Structure

Each analysis run creates these files in `/stats-static/{date}/`:
- `_all.json`: Import path usage statistics
- `_all_dependencies.json`: Dependency analysis across products
- `all_pf_versions.json`: PatternFly package versions by repository
- `_all_product_uses.json`: Component usage by product with file locations
- `_all_sorted.json`: Components categorized by PatternFly package
- `_deprecated_usage.json`: Deprecated component usage tracking

### Dependents Analysis Files (when `-d` flag used):
- `_dependents_analysis.json`: Complete analysis of all PatternFly package dependents
- `_suggested_repos.json`: Prioritized list of repositories to consider adding
- `_dependents_by_package.json`: Summary of missing dependents by PatternFly package

## Development Commands

### Data Collection
```bash
npm run collect                    # Run complete analysis pipeline
npm run collect-with-dependents    # Run analysis + GitHub dependents analysis
npm run collect -- -c              # Clean /tmp directory before collection
npm run collect -- -j -d           # Run with package stats and dependents analysis
```

### GitHub Dependents Analysis
```bash
npm run analyze-dependents  # Compare GitHub dependents with local repos.json
npm run sync-dependents     # Create PR to add missing dependents (requires GITHUB_TOKEN)

# Custom repository analysis
node src/github-dependents-analyzer.js --repo-url https://github.com/patternfly/patternfly-react
node src/github-dependents-analyzer.js --repo-url https://github.com/patternfly/patternfly-react --create-pr
```

### Report Generation
```bash
# Generate Excel reports from JSON data
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 to_xls.py
```

## Repository Configuration

- `repos.json`: Defines which repositories to analyze
- Each entry has `git` (repository URL) and `name` (display name)
- Add new repositories by editing this file

## Key Data Structures

- **Import Analysis**: Tracks how components are imported (`@patternfly/react-core` vs `@patternfly/react-core/`)
- **Usage Tracking**: Counts component usage across files with exact file locations
- **Version Analysis**: Maps PatternFly package versions to consuming repositories
- **Deprecation Tracking**: Identifies deprecated component usage for migration planning

## Working with Results

- Results in `/stats-static/` are organized by date
- JSON files contain raw analysis data
- Excel reports provide user-friendly views of the data
- Use `_all_product_uses.json` to find where specific components are used
- Use `_deprecated_usage.json` to track migration needs