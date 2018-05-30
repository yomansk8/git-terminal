#!/bin/bash

DIR=.
if [ "$1" != "" ]; then DIR=$1; fi
cd $DIR>/dev/null;

RESULTS=""

for d in `find ${DIR} -name .git -type d -prune`; do
  cd $d/..>/dev/null;
  git fetch origin>/dev/null;
  BRANCH="$(git symbolic-ref --short HEAD)"
  LOCAL=$(git rev-parse @)
  REMOTE=$(git rev-parse @{u})
  BASE=$(git merge-base @ @{u})
  STATUS=""
  if [ $LOCAL = $REMOTE ]; then
    STATUS="Up-to-date"
  elif [ $LOCAL = $BASE ]; then
    STATUS="Need to pull"
  elif [ $REMOTE = $BASE ]; then
    STATUS="Need to push"
  else
    STATUS="Diverged"
  fi
  RESULTS="${RESULTS}\n${PWD};${BRANCH};${STATUS}"
done

echo $RESULTS
