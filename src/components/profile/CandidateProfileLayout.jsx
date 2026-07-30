import ProfilePageShell from './ProfilePageShell';
import CandidateProfileHeader from './CandidateProfileHeader';
import ProfileActionBar from './ProfileActionBar';
import ProfileSidebar from './ProfileSidebar';
import {
  profileBodyShellClass,
  profileDesktopAsideClass,
  profileDesktopGridClass,
  profileDesktopMainClass,
} from './profileLayoutClasses';

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
      <div className={profileBodyShellClass}>
        {sidebarContent ? (
          <div className={profileDesktopGridClass}>
            <main className={profileDesktopMainClass}>{children}</main>
            <aside className={profileDesktopAsideClass}>{sidebarContent}</aside>
          </div>
        ) : (
          <main className={`${profileDesktopMainClass} mx-auto max-w-3xl lg:max-w-none`}>
            {children}
          </main>
        )}
      </div>
    </ProfilePageShell>
  );
}
