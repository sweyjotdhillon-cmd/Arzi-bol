import { useState } from 'react';
import { ErrorProvider } from './components/ErrorBanner';
import { HomeView } from './components/HomeView';
import { Layout, type ActiveView } from './components/Layout';
import {
  loadStoredApiKeys,
  SettingsModal,
  type ApiKeysConfig,
} from './components/SettingsModal';
import { TermsView } from './components/TermsView';

function ArziBolShell() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeysConfig>(() =>
    loadStoredApiKeys()
  );

  const hasConfiguredKeys = Boolean(
    apiKeys.sarvamApiKey.trim() && apiKeys.geminiApiKey.trim()
  );

  return (
    <Layout
      activeView={activeView}
      onNavigate={setActiveView}
      onOpenSettings={() => setIsSettingsOpen(true)}
      hasConfiguredKeys={hasConfiguredKeys}
    >
      {activeView === 'home' ? (
        <HomeView
          hasConfiguredKeys={hasConfiguredKeys}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTerms={() => setActiveView('terms')}
        />
      ) : (
        <TermsView onBack={() => setActiveView('home')} />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={setApiKeys}
      />
    </Layout>
  );
}

export function App() {
  return (
    <ErrorProvider>
      <ArziBolShell />
    </ErrorProvider>
  );
}

export default App;
