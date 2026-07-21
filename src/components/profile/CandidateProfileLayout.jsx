import ProfilePageShell from './ProfilePageShell';
import CandidateProfileHeader from './CandidateProfileHeader';
import ProfileActionBar from './ProfileActionBar';
import ProfileSidebar from './ProfileSidebar';

export default function CandidateProfileLayout({
  title,
  backButton = true,
  profile,
  email,
  isOwn = false,
  onAvatarChange,
  avatarLoading,
  avatarPhase,
  onCoverChange,
  coverLoading,
  coverPhase,
  onCoverRemove,
  coverSrc,
  onShare,
  shareUrl,
  shareTitle,
  reportTargetId,
  onSettings,
  onEditIntro,
  onMessage,
  messageLoading = false,
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
        avatarPhase={avatarPhase}
        onCoverChange={onCoverChange}
        onCoverRemove={onCoverRemove}
        coverLoading={coverLoading}
        coverPhase={coverPhase}
        coverSrc={coverSrc}
        onEditIntro={onEditIntro}
      />
      <ProfileActionBar
        isOwn={isOwn}
        onMessage={onMessage}
        messageLoading={messageLoading}
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
