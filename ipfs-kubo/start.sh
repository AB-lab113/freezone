#!/bin/sh
ipfs init --profile=server
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080
ipfs config --json Addresses.Swarm '["/ip4/0.0.0.0/tcp/4001","/ip6/::/tcp/4001","/ip4/0.0.0.0/udp/4001/quic-v1","/ip6/::/udp/4001/quic-v1"]'
ipfs config --json Addresses.Announce '["/dns4/zonefreipfs.app.runonflux.io/tcp/4001"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'

mkdir -p /tmp/site
echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=https://zonefreeweb.app.runonflux.io"><title>ZoneFree</title></head><body><a href="https://zonefreeweb.app.runonflux.io">Redirecting...</a></body></html>' > /tmp/site/index.html

mkdir -p /tmp/blabla
echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=https://blablaprivacy.app.runonflux.io"><title>Blabla.Privacy</title></head><body><a href="https://blablaprivacy.app.runonflux.io">Redirecting...</a></body></html>' > /tmp/blabla/index.html

ipfs daemon &
DAEMON_PID=$!
sleep 20

CID=$(ipfs add -r -Q /tmp/site)
echo "REDIRECT_CID_ZONEFREE=$CID"
ipfs pin add $CID

CID_BLABLA=$(ipfs add -r -Q /tmp/blabla)
echo "REDIRECT_CID_BLABLA=$CID_BLABLA"
ipfs pin add $CID_BLABLA

wait $DAEMON_PID
