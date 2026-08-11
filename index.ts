import { registerRootComponent } from 'expo';

// Import before React mounts: Expo can launch this module directly in background.
import './src/tracking/locationTask';
import App from './App';

registerRootComponent(App);
