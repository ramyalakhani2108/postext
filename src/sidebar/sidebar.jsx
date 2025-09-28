import React from 'react';
import { createRoot } from 'react-dom/client';
import ModernApp from './components/ModernApp';
import './styles/sidebar.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<ModernApp />);