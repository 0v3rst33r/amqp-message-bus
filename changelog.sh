#!/bin/bash

npm run changelog

sed -i -e "s/-0v3rst33r/.com/g" CHANGELOG.md
rm CHANGELOG.md-e
