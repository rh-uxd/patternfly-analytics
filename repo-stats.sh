#!/bin/bash
REPOS=(
  https://github.com/RedHatInsights/frontend-components
  https://github.com/RedHatInsights/drift-frontend
  https://github.com/openshift/console
  https://github.com/integr8ly/tutorial-web-app
  https://github.com/project-koku/koku-ui
)

mkdir -p stats

for repo in "${REPOS[@]}"; do
  REPONAME=$(echo $repo | cut -d'/' -f5)
  # git clone "$repo" "./tmp/${REPONAME}" --depth 1
  node ./repo-stats.js "./tmp/$REPONAME" > "stats/${REPONAME}.json"
done
