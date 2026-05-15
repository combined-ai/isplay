import { ButtonIcon, Tag } from "../shared/Primitives";

export function Hero() {
  return (
    <section className="section_hero">
      <div className="padding-global">
        <div className="container-large">
          <div className="hero_wrapper">
            <div className="hero_copy-part">
              <div className="heading-tag-box">
                <div className="hero_tag-wrapper">
                  <Tag fade="" shuffle="">
                    Intro
                  </Tag>
                </div>
                <h1 className="t-heading-1-rg">
                  Understand your agent's decisions
                  <br />
                  <span className="hero_transparent-part">Replayable infrastructure for agent investigations</span>
                </h1>
              </div>
              <div className="button-group is-hero">
                <ButtonIcon label="Install" href="/docs/install" variant="white" eventName="Install-hero" />
                <ButtonIcon label="Agent skill" href="/docs/install#recommended-agent-skill" variant="transparent" eventName="Skill-hero" />
              </div>
            </div>
            <div className="hero_overlay-grad" />
            <div data-waves="bg" className="waves">
              <canvas id="waves-canvas" className="waves-canvas" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
