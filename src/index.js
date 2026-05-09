import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App, { AppErrorBoundary } from './App';
import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { defineChain } from '@reown/appkit/networks';

const mainnet = defineChain({
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://cloudflare-eth.com', 'https://rpc.ankr.com/eth'] }
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://etherscan.io' }
  }
});
const ethersAdapter = new EthersAdapter();

createAppKit({
  adapters: [ethersAdapter],
  networks: [mainnet],
  projectId: 'd65a475ce4a23ba152de3dc5a8e3639b',
  metadata: {
    name: 'Zone Free',
    description: 'Forum décentralisé - Libre et Privé',
    url: window.location.origin,
    icons: []
  },
  features: { analytics: false },
  featuredWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b7928c724b6ff7d096ede6ea4',
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369'
  ]
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(function(err) { console.log('SW error:', err); });
  });
}
