#!/bin/sh
rm -rf ./output/*
mkdir -p ./output
export DISPLAY=:9.0
Xvfb -ac -screen scrn 1280x800x16 $DISPLAY & node test.js
