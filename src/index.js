import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { mainnet } from '@reown/appkit/networks';

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
root.render(<React.StrictMode><App /></React.StrictMode>);
