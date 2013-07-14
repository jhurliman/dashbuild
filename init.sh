#!/bin/sh

echo Running npm install in plugins/sources/*
find ./plugins/sources/* -type d -maxdepth 1 -exec sh -c '(cd {} && npm install)' ';'
