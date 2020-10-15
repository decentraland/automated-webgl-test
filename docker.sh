#!/bin/sh
mkdir ./output
Xvfb -ac -screen scrn 1280x800x16 :9.0 & node test.js
