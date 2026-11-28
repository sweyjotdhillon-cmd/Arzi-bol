import { useState } from 'react';
import { GlobalErrorProvider } from './components/GlobalErrorState';
import { HomePresentation } from './components/HomePresentation';
import { Layout, type ActiveView } from './components/Layout';
import {
  loadStoredApiKeys,
  SettingsModal,
  type ApiKeysConfig,
} from './components/SettingsModal';
import {
  hasAcceptedTerms as loadAcceptedTerms,
  TermsAndConditions,
} from './components/TermsAndConditions';

function ArziBolShell() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(() =>
    loadAcceptedTerms()
  );
  const [apiKeys, setApiKeys] = useState<ApiKeysConfig>(() =>
    loadStoredApiKeys()
  );

  const hasConfiguredKeys = Boolean(
    apiKeys.sarvamApiKey.trim() && apiKeys.llmApiKey.trim()
  );

  const handleTermsAgreed = () => {
    setTermsAccepted(true);
    setIsTermsModalOpen(false);
    setActiveView('home');
  };

  return (
    <Layout
      activeView={activeView}
      onNavigate={setActiveView}
      onOpenSettings={() => setIsSettingsOpen(true)}
      hasConfiguredKeys={hasConfiguredKeys}
    >
      {activeView === 'home' ? (
        <HomePresentation
          hasConfiguredKeys={hasConfiguredKeys}
          hasAcceptedTerms={termsAccepted}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTerms={() => setActiveView('terms')}
          onRequestTermsGate={() => setIsTermsModalOpen(true)}
        />
      ) : (
        <TermsAndConditions
          hasAccepted={termsAccepted}
          onAgree={handleTermsAgreed}
          onBack={() => setActiveView('home')}
        />
      )}

      {isTermsModalOpen && (
        <TermsAndConditions
          variant="modal"
          hasAccepted={termsAccepted}
          onAgree={handleTermsAgreed}
          onBack={() => setIsTermsModalOpen(false)}
        />
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
    <GlobalErrorProvider>
      <ArziBolShell />
    </GlobalErrorProvider>
  );
}

export default App;
