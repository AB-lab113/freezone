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
  features: { analytics: false }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>);
