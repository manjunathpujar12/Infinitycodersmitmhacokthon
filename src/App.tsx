import React, { useState } from 'react';
import { CandidateAuthProvider, useCandidateAuth } from './context/CandidateAuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar, CandidateTabId } from './components/common/Sidebar';
import { ToastContainer } from './components/common/Toast';

// Pages
import { AuthPage } from './components/pages/AuthPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { SkillsExperiencePage } from './components/pages/SkillsExperiencePage';
import { LocationPreferencesPage } from './components/pages/LocationPreferencesPage';
import { RelocationPreferencesPage } from './components/pages/RelocationPreferencesPage';
import { JobOpeningsPage } from './components/pages/JobOpeningsPage';
import { RoleMatchingPage } from './components/pages/RoleMatchingPage';
import { AllocationStatusPage } from './components/pages/AllocationStatusPage';
import { SlotBookingPage } from './components/pages/SlotBookingPage';
import { WaitlistTimedOffersPage } from './components/pages/WaitlistTimedOffersPage';
import { ConfirmationPage } from './components/pages/ConfirmationPage';
import { AttendanceStatusPage } from './components/pages/AttendanceStatusPage';
import { TravelClaimsPage } from './components/pages/TravelClaimsPage';
import { RelocationClaimsPage } from './components/pages/RelocationClaimsPage';

const CandidatePortalContent: React.FC = () => {
  const { isAuthenticated } = useCandidateAuth();
  const [activeTab, setActiveTab] = useState<CandidateTabId>('profile');

  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <ToastContainer />
      </>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfilePage />;
      case 'skills-experience':
        return <SkillsExperiencePage />;
      case 'location-preferences':
        return <LocationPreferencesPage />;
      case 'relocation-preferences':
        return <RelocationPreferencesPage />;
      case 'job-openings':
        return <JobOpeningsPage onNavigateToMatch={() => setActiveTab('role-matching')} />;
      case 'role-matching':
        return <RoleMatchingPage onNavigateToSlots={() => setActiveTab('slot-booking')} />;
      case 'allocation-status':
        return <AllocationStatusPage />;
      case 'slot-booking':
        return <SlotBookingPage onNavigateToConfirmation={() => setActiveTab('confirmation')} />;
      case 'waitlist-timed-offers':
        return (
          <WaitlistTimedOffersPage
            onNavigateToConfirmation={() => setActiveTab('confirmation')}
          />
        );
      case 'confirmation':
        return <ConfirmationPage onNavigateToSlots={() => setActiveTab('slot-booking')} />;
      case 'attendance-status':
        return <AttendanceStatusPage />;
      case 'travel-claims':
        return <TravelClaimsPage />;
      case 'relocation-claims':
        return <RelocationClaimsPage />;
      default:
        return <ProfilePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-textPrimary">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8F7F2]">
          <div className="max-w-6xl mx-auto">{renderActiveTab()}</div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <CandidateAuthProvider>
      <CandidatePortalContent />
    </CandidateAuthProvider>
  );
}

export default App;

