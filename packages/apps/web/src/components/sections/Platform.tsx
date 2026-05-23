import { assets } from "@/lib/assets";
import { enterpriseCards } from "@/lib/content";
import { ButtonIcon, CornerMarks, Tag } from "../shared/Primitives";
import { PlatformIcon } from "./PlatformIcon";

function PlatformCard({ card }: { card: (typeof enterpriseCards)[number] }) {
  return (
    <div className={`enterprise_card-wrapper${card.wrapperClass ?? ""}`}>
      <div className="enterprice_card">
        <div className="enterprice_card-icon-box">
          <div className="t-label-3-rg text-color-accent">{card.number}</div>
          <CornerMarks />
          <div
            className="enterprice_img"
            data-w-id={card.wId}
            data-animation-type="lottie"
            data-src={card.lottie}
            data-loop="1"
            data-direction="1"
            data-autoplay="1"
            data-is-ix2-target="0"
            data-renderer="svg"
            data-default-duration="0"
            data-duration="0"
            data-loading="eager"
          >
            <PlatformIcon kind={card.icon} />
          </div>
        </div>
        <div shuffle={card.shuffle} className="enterprice_card-copy">
          <h3 data-fade-in="opacity" shuffle="el" className="t-label-1-rg">
            {card.title}
          </h3>
          <p data-fade-in-stagger="line" className="t-paragraph-2-rg text-color-light-gray">
            {card.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Platform() {
  return (
    <section className="section_enterprise">
      <div id="enterprise" className="scroll-anchor" />
      <div className="padding-global">
        <div className="container-large">
          <div className="enterprice_wrapper">
            <div className="enterprise_dvider" />
            <div className="enterprise_left-part">
              <div className="enterprice_sticky-part">
                <div className="enterprice_copy-part">
                  <div className="heading-tag-box">
                    <Tag>Platform</Tag>
                    <h2 data-fade-in-stagger="word" className="t-heading-2-rg">
                      Capture runs, branch hypotheses, and explain what changed
                    </h2>
                  </div>
                  <p data-fade-in-stagger="line" className="t-paragraph-1-rg text-color-light-gray">
                    isplay turns agent execution into structured evidence: context inventory, checkpoints, fixture requirements, diffs, statistics, and ranked effects.
                  </p>
                  <div data-fade-in="move" className="button-group">
                    <ButtonIcon
                      label="Install"
                      href="/docs/install"
                      variant="transparent"
                      eventName="Install-platform-section"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="enterprise_right-part">
              {enterpriseCards.map((card) => (
                <PlatformCard key={card.number} card={card} />
              ))}
            </div>

            <div id="w-node-f402960b-007b-71db-f444-aae7021efd02-0d3ebacd" data-w-id="f402960b-007b-71db-f444-aae7021efd02" className="enterprise_grid-col">
              <div className="enterprise_left-canvas">
                <div data-video="playpause" className="enterprise_-left-cover-video">
                  <video muted loop playsInline src={assets.videos.particle} poster={assets.videos.particlePoster} preload="metadata" className="cover-video__video" />
                </div>
                <div className="enterprice_left-grad-el" />
                <div className="enterprice_top-grad-el" />
                <div className="enterprice_bottom-grad-el" />
              </div>
              <div id="threads-container" className="enterprise_right-canvas w-node-_0341fd63-da0d-d3f7-f0bf-c949fd6057f7-0d3ebacd">
                <div data-video="playpause" className="enterprise_rgiht-cover-video">
                  <video muted loop playsInline src={assets.videos.wave} poster={assets.videos.wavePoster} preload="metadata" className="cover-video__video" />
                </div>
                <div className="enterprice_right-grad-el" />
                <div className="enterprice_top-grad-el" />
                <div className="enterprice_bottom-grad-el" />
              </div>
              <div id="w-node-_4a2e8be1-422c-a16a-0ad6-ff35b0c3b3b5-0d3ebacd" className="enterprice_info-box">
                <div shuffle="scroll" data-w-id="d36b08ed-b89c-c677-f73b-a43123b15cb0" className="enterprise_info-container">
                  <CornerMarks bottomLeft />
                  <div data-w-id="246be943-50e6-02cc-4cb1-6e6856fdd6a1" className="enterprise_info">
                    <div shuffle="el" className="t-label-3-rg text-color-white">
                      Allow AI to RCA
                      <br />
                    </div>
                    <div shuffle="el" className="t-label-3-rg text-color-white">
                      your agentic
                      <br />
                    </div>
                    <div shuffle="el" className="t-label-3-rg text-color-white">
                      systems easily
                    </div>
                  </div>
                </div>
              </div>
              <div className="enterprise_dvider" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
