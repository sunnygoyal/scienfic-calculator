#!/bin/sh
# Build file to zip all the necessary files.

# start fresh
rm -rf build
mkdir ./build

# copy all the resources
cp chrome.manifest build/
cp install.rdf build/
rsync -av --exclude=".*" locale build/
rsync -av --exclude=".*" content build/
rsync -av --exclude=".*" defaults build/

# Create zip
pushd build
zip -r ../scicalc.xpi .
popd

# cleanup
rm -rf ./build
