import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyFontScale, loadFontScaleId } from './utils/fontScale';

// El tamaño de letra elegido se aplica antes de pintar nada (sin saltos al abrir)
applyFontScale(loadFontScaleId());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
