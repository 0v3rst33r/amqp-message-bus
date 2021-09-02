#!/bin/bash

PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')
PACKAGE_VERSION="${PACKAGE_VERSION:1}"

git flow release start $PACKAGE_VERSION

./changelog.sh
git add CHANGELOG.md

git commit -m "docs(changelog): \`CHANGELOG\` for \`$PACKAGE_VERSION\` release."

git push --set-upstream origin release/$PACKAGE_VERSION

# git flow release finish -m "$PACKAGE_VERSION release" -p $PACKAGE_VERSION
# git push origin --tags
