# @dcl/tester

Use a headless chrome to explore Decentraland. Work in progress.

## Running

1. Clone this repo with `git clone git@github.com:decentraland/dcl-tester`
2. Run `docker build -t dcl-tester .`
3. Run `docker run -v ${PWD}/output:/run/output -it --privileged dcl-tester`
