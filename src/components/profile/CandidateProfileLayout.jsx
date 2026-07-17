import ProfilePageShell from './ProfilePageShell';
import CandidateProfileHeader from './CandidateProfileHeader';
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
  onCoverChange,
  coverLoading,
  coverSrc,
  onShare,
  shareUrl,
  shareTitle,
  reportTargetId,
  onSettings,
  onEditIntro,
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
      <CandidateProfileHeader
        profile={profile}
        isOwn={isOwn}
        onAvatarChange={onAvatarChange}
        avatarLoading={avatarLoading}
        onCoverChange={onCoverChange}
        coverLoading={coverLoading}
        coverSrc={coverSrc}
        onEditIntro={onEditIntro}
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
