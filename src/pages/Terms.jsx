import { Link } from "react-router-dom";
import LegalPage, { LegalSection } from "../components/LegalPage";

const UPDATED = "September 24, 2026";

function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      intro="FrostWolf is a hobby project for finding and sharing game mods. By creating an account or uploading content, you agree to these informal house rules. This is not legal advice. If you need guarantees, consult a lawyer."
    >
      <LegalSection heading="1. What FrostWolf is">
        <p>
          FrostWolf lets people publish mod projects (descriptions, images,
          files, changelogs) and lets visitors browse and download them. The
          service is provided as-is, for free, and can change or shut down at
          any time without notice.
        </p>
      </LegalSection>

      <LegalSection heading="2. Accounts">
        <p>
          You need an account to publish, rate, or manage projects. You are
          responsible for keeping your login safe and for anything done with
          your account. One account per person for normal use. We may suspend
          or delete accounts that abuse the service, with or without warning.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your content stays yours">
        <p>
          You keep ownership of the mods, text, and images you upload. By
          publishing on FrostWolf you give us permission to host, store,
          display, and distribute that content so the site works (including
          backups and CDN delivery). You can delete your projects at any time
          from your dashboard.
        </p>
      </LegalSection>

      <LegalSection heading="4. Your promises when you upload">
        <p>When you publish a project or version, you confirm that:</p>
        <ul className="list-disc pl-5">
          <li>You own the rights or have permission to share it.</li>
          <li>
            It contains no malware, stealers, miners, or intentionally harmful
            code.
          </li>
          <li>
            It respects the game&apos;s EULA and third-party licenses (for
            example, Minecraft&apos;s EULA: no paywalled gameplay, no
            redistributing game files you don&apos;t own).
          </li>
          <li>
            It follows our <Link to="/rules" className="text-blue-400 hover:underline">Community Rules</Link>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Downloads are at your own risk">
        <p>
          Mods are made by the community, not reviewed line-by-line by us.
          Back up your worlds/saves before installing anything, scan files if
          in doubt, and check the game version and loader. We are not liable
          for broken saves, crashes, bans on third-party servers, or any
          damage from using downloaded files, to the extent allowed by law.
        </p>
      </LegalSection>

      <LegalSection heading="6. Moderation and removal">
        <p>
          This is a hobby project with best-effort moderation. We may edit,
          unlist, remove, or refuse any content, and suspend accounts that
          break these terms or the Community Rules. If your content is
          reported (for example, copyright or malware), we may take it down
          first and ask questions after. Repeat offenders lose access.
        </p>
      </LegalSection>

      <LegalSection heading="7. Acceptable use">
        <p>
          Don&apos;t spam, scrape aggressively, try to break in, upload illegal
          content, harass others, or mislead downloaders (fake names,
          misleading versions, impersonation). Don&apos;t use FrostWolf for
          anything unlawful.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to these terms">
        <p>
          If these terms change, we&apos;ll update the date above. Continued
          use of FrostWolf after changes means you accept the new version.
        </p>
        <p>
          Questions? See the <Link to="/rules" className="text-blue-400 hover:underline">Community Rules</Link> and{" "}
          <Link to="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

export default Terms;
