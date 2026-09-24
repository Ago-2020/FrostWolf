import { Link } from "react-router-dom";
import LegalPage, { LegalSection } from "../components/LegalPage";

const UPDATED = "September 24, 2026";

function Guidelines() {
  return (
    <LegalPage
      title="Community Rules"
      updated={UPDATED}
      intro="Keep FrostWolf trustworthy for players and fair for creators. Breaking these rules can get content removed and accounts suspended. Enforcement is best-effort. This is a hobby project, not a 24/7 moderation team."
    >
      <LegalSection heading="1. Only share what you may share">
        <ul className="list-disc pl-5">
          <li>Share your own work, or re-uploads you have explicit permission for.</li>
          <li>No repacks, leaks, or claiming someone else&apos;s mod as yours.</li>
          <li>Credit authors, translators, and asset sources. Respect licenses (MIT, GPL, CC, etc.).</li>
          <li>No redistributing game files or bypassing paywalls/DRM.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. No harmful files, ever">
        <ul className="list-disc pl-5">
          <li>No malware, stealers, miners, ransomware, or obfuscated harmful payloads.</li>
          <li>No fake download buttons, password-locked archives hiding payloads, or misleading binaries.</li>
          <li>If your mod needs an external installer, say so clearly in the description.</li>
        </ul>
        <p>
          Malware or suspected malware is removed immediately and the uploader
          is banned. If you suspect a file, stop using it and report it.
        </p>
      </LegalSection>

      <LegalSection heading="3. Describe honestly">
        <ul className="list-disc pl-5">
          <li>Tag the correct game, loaders, and game versions.</li>
          <li>No fake names, impersonation, misleading version numbers, or inflated claims.</li>
          <li>Screenshots and gallery images should show your actual project.</li>
          <li>Changelogs should describe what actually changed.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Keep it civil and legal">
        <ul className="list-disc pl-5">
          <li>No spam, hate, harassment, or threats.</li>
          <li>No pornographic or excessively graphic content in listings or images.</li>
          <li>No illegal content, and no content that helps others break the law.</li>
          <li>No aggressive scraping, spam ratings, or vote manipulation.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Reports and takedowns">
        <p>
          Found a stolen mod, malware, or rule-breaking content? Report it with
          links and evidence: which project/version, why it violates the
          rules, and (for copyright) proof you own the work. Valid reports get
          content unlisted or removed first; uploaders who disagree can appeal
          with counter-evidence. Repeat infringers lose their accounts.
        </p>
        <p>
          Until a dedicated report button exists, use the contact method listed
          on the site or reach the operator directly with the project URL.
        </p>
      </LegalSection>

      <LegalSection heading="6. Consequences">
        <p>
          First minor issues usually mean a warning or unlisting. Malware,
          theft, spam, or repeated violations mean removal and suspension. We
          don&apos;t owe a detailed explanation for every action, but we try to
          be fair.
        </p>
        <p>
          By using FrostWolf you also accept the{" "}
          <Link to="/terms" className="text-blue-400 hover:underline">Terms of Service</Link> and{" "}
          <Link to="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

export default Guidelines;
