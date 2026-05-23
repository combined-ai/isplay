import { assets } from "@/lib/assets";
import { skillInstallCommand } from "@/lib/content";
import { CommandBlock } from "../shared/CommandBlock";
import { ButtonIcon, Tag } from "../shared/Primitives";

const plusClasses = [
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  " hide-mobile-landscape",
  " hide-mobile-landscape",
  " hide-tablet",
  " hide-tablet",
  " hide-tablet",
  " hide-tablet",
  " hide-tablet",
  " hide-tablet",
  " hide-tablet",
  " hide-tablet",
];

export function Install() {
  return (
    <section className="section_install">
      <div className="padding-global">
        <div className="container-large">
          <div className="install_wrapper">
            <div className="plus-divider-box">
              {plusClasses.map((className, index) => (
                <img key={index} src={assets.plus} loading="eager" alt="" className={`plus-icon${className}`} />
              ))}
            </div>
            <div className="install_preview-grid">
              <div className="install_heading-box">
                <Tag variant="gray">Install</Tag>
                <h2 data-fade-in-stagger="word" className="t-heading-2-rg">
                  Let an agent wire replay into your project
                </h2>
              </div>
              <div className="install_preview-action">
                <CommandBlock featured>{skillInstallCommand}</CommandBlock>
                <p data-fade-in-stagger="line" className="t-paragraph-1-rg text-color-light-gray">
                  Recommended: install the skill, restart Codex, then prompt $isplay-analysis to choose the adapter, capture a run, and analyze it.
                </p>
                <div className="button-group">
                  <ButtonIcon label="Install docs" href="/docs/install" variant="transparent" eventName="Agent-install-home" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
