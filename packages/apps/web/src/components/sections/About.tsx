import { assets } from "@/lib/assets";
import { Tag } from "../shared/Primitives";

const traceItems = ["Context inventory", "Model calls", "Tool outputs"];
const evidenceItems = [
  "Checkpoint forks",
  "Fixture requirements",
  "Replay diffs",
  "Trial matrix",
  "Ranked effects",
  "Validity labels",
];

export function About() {
  return (
    <section className="section_about">
      <div id="about" className="scroll-anchor" />
      <div className="padding-global">
        <div className="container-large">
          <div className="about_wrapper">
            <div className="about_content-container">
              <img src={assets.logoIcon} loading="eager" width="41" height="32" alt="" data-fade-in="opacity" className="about_symbol" />
              <div className="about_logos-wrapper">
                <Tag variant="gray">Trace includes</Tag>
                <div data-fade-in="move" className="about_logos-group">
                  {traceItems.map((item, index) => (
                    <div key={item} className={`about_logos-link${index === traceItems.length - 1 ? " is-last" : ""}`}>
                      <div className="t-label-3-rg text-color-light-gray">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="about_logos-wrapper">
                <Tag variant="gray">Analyst agents can inspect</Tag>
                <div data-fade-in="move" className="about_angels-part">
                  <div className="splide is-about-partners">
                    <div className="splide__track is-about-partners w-dyn-list">
                      <div role="list" className="splide__list is-about-partners w-dyn-items">
                        {evidenceItems.map((item) => (
                          <div key={item} role="listitem" className="splide__slide is-about-partners w-dyn-item">
                            <div className="t-label-3-rg text-color-light-gray">{item}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
