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
  onSaveField,
  savingField,
  onContact,
  sidebar,
  children,
}) {
  const sidebarContent =
    sidebar ?? <ProfileSidebar profile={profile} email={email} isOwn={isOwn} />;

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
        contactDisabled={!hasCandidateContact(profile)}
      />
      <div className="mx-auto max-w-5xl px-space-base py-space-lg">
        <div
          className={
            sidebarContent
              ? 'grid gap-space-lg lg:grid-cols-[minmax(0,1fr)_280px]'
              : 'mx-auto max-w-3xl'
          }
        >
          <main className="space-y-space-base">{children}</main>
          {sidebarContent ? <div className="space-y-space-base lg:order-none">{sidebarContent}</div> : null}
        </div>
      </div>
    </ProfilePageShell>
  );
}
