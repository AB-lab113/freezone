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
  projectId: 'c3a8790d-1022-4ff0-96d7-de5cc821fac4',
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
