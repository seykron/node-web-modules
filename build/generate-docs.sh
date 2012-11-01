#!/bin/bash
JAVA=`which java`

if [ -x $JAVA ]; then
  version=$("$JAVA" -version 2>&1 | awk -F '"' '/version/ {print $2}')

  if [[ "$version" > "1.5" ]]; then
    echo "Building API documentation (Java v$version found)...";

    $JAVA -jar ./build/jsdoc/jsrun.jar ./build/jsdoc/app/run.js \
      -t=./build/jsdoc/templates/jsdoc \
      --d=./docs ./lib
  else
    echo "java >= 1.6 is required to build documentation with jsdoc-toolkit."
  fi

else
  echo "Java not found, skipping documentation.";
fi
