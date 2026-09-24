import { Link } from "react-router-dom";
import LegalPage, { LegalSection } from "../components/LegalPage";

const UPDATED = "September 24, 2026";

function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro="Short version: we store the minimum needed to run accounts and mod hosting. Most of what you publish is public by design. No ads, no trackers, no data selling. This is a hobby project."
    >
      <LegalSection heading="1. What we collect">
        <ul className="list-disc pl-5">
          <li>
            Account: email address and login data, handled by Supabase Auth
            (passwords are hashed by Supabase, we never see them).
          </li>
          <li>
            Profile: username, display name, avatar URL, bio (whatever you
            choose to fill in).
          </li>
          <li>
            Content: projects, descriptions, summaries, icons, gallery images,
            version files, changelogs, tags, ratings/votes.
          </li>
          <li>
            Technical minimum: timestamps, download/vote counters, and basic
            Supabase operational logs needed for security.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. What is public">
        <p>
          Usernames, display names, avatars, published projects, icons,
          descriptions, files metadata, and ratings are public to anyone
          browsing FrostWolf. That&apos;s the point of a mod listing site. Do
          not put private info (real address, phone, secrets) in public
          fields.
        </p>
      </LegalSection>

      <LegalSection heading="3. Hosting and storage">
        <p>
          Data is stored and processed by Supabase (database, auth, and file
          storage buckets such as project files and icons). Files you upload
          live there so visitors can download them. Backups may retain deleted
          data for a short operational window.
        </p>
      </LegalSection>

      <LegalSection heading="4. Cookies">
        <p>
          We don&apos;t set advertising or analytics cookies. Supabase Auth
          uses cookies/local storage only to keep you logged in. Embedded
          YouTube videos (if a project includes one) load from YouTube&apos;s
          privacy-enhanced mode and are subject to Google&apos;s policies.
        </p>
      </LegalSection>

      <LegalSection heading="5. What we don&apos;t do">
        <p>
          No selling your email, no ad profiling, no third-party analytics
          currently. If that ever changes, this page will be updated first.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your choices">
        <p>
          You can edit your profile, unpublish or delete your projects, and
          delete versions from your dashboard at any time. For account deletion
          or correction requests (for example, remove your email/account
          entirely), contact the site operator. We&apos;ll handle it manually
          since this is a small hobby setup with no automated export flow yet.
        </p>
        <p>
          Related: <Link to="/terms" className="text-blue-400 hover:underline">Terms of Service</Link> ·{" "}
          <Link to="/rules" className="text-blue-400 hover:underline">Community Rules</Link>
        </p>
      </LegalSection>
    </LegalPage>
  );
}

export default Privacy;
