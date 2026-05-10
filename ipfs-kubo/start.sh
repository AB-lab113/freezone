#!/bin/sh
ipfs init --profile=server
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
mkdir -p /tmp/site
echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=https://zonefreeweb.app.runonflux.io"><title>ZoneFree</title></head><body><a href="https://zonefreeweb.app.runonflux.io">Redirecting...</a></body></html>' > /tmp/site/index.html
ipfs daemon &
DAEMON_PID=$!
sleep 20
CID=$(ipfs add -r -Q /tmp/site)
echo "REDIRECT_CID=$CID"
ipfs pin add $CID
wait $DAEMON_PID
