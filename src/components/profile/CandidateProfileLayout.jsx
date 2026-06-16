import ProfilePageShell from './ProfilePageShell';
import ProfileHero from './ProfileHero';
import ProfileActionBar from './ProfileActionBar';
import ProfileSidebar from './ProfileSidebar';
import { hasCandidateContact } from '../../utils/contact';

export default function CandidateProfileLayout({
  title,
  backButton = true,
  profile,
  email,
  isOwn = false,
  onAvatarChange,
  avatarLoading,
  onShare,
  shareUrl,
  shareTitle,
  reportTargetId,
  onSettings,
  onLogout,
  onDeleteAccount,
  onSaveField,
  savingField,
  onContact,
  sidebar,
  children,
}) {
  return (
    <ProfilePageShell
      title={title}
      backButton={backButton}
      onShare={onShare}
      shareUrl={shareUrl}
      shareTitle={shareTitle}
      reportTargetId={reportTargetId}
      isOwn={isOwn}
      onSettings={onSettings}
      onLogout={onLogout}
      onDeleteAccount={onDeleteAccount}
    >
      <ProfileHero
        profile={profile}
        isOwn={isOwn}
        onAvatarChange={onAvatarChange}
        avatarLoading={avatarLoading}
        onSaveField={onSaveField}
        savingField={savingField}
      />
      <ProfileActionBar
        isOwn={isOwn}
        onContact={onContact}
        disabled={!hasCandidateContact(profile)}
      />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main className="space-y-4">{children}</main>
          <div className="space-y-4 lg:order-none">
            {sidebar || <ProfileSidebar profile={profile} email={email} />}
          </div>
        </div>
      </div>
    </ProfilePageShell>
  );
}
