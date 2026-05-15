import { BrandLogo } from "../shared/Logo";

export function PreFooter() {
  return (
    <footer preload-section="true" className="section_pre-footer">
      <div className="padding-global">
        <div className="container-large">
          <div className="pre-footer_wrapper">
            <div className="pre-footer_logo-part">
              <a href="/" aria-current="page" className="navbar_logo-link w-nav-brand w--current">
                <BrandLogo fade />
              </a>
            </div>
            <div data-fade-in="opacity" className="t-paragraph-1-rg text-color-gray">
              © <span id="current-year">2026</span> isplay
            </div>
            <div className="button-group">
              <a data-umami-event="Docs-footer" shuffle="true" data-fade-in="opacity" href="/docs" className="footer_link w-inline-block">
                <div shuffle="el" className="t-label-3-rg">
                  docs
                </div>
              </a>
              <a data-umami-event="Install-footer" shuffle="true" data-fade-in="opacity" href="/docs/install" className="footer_link w-inline-block">
                <div shuffle="el" className="t-label-3-rg">
                  install
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function FooterWaves() {
  return (
    <footer preload-section="true" className="section_footer">
      <div className="padding-global">
        <div className="container-large">
          <div className="footer_wrapper">
            <div className="footer_overlay-grad" />
            <div data-waves="bg" className="footer-waves">
              <canvas className="waves-canvas" />
            </div>
            <BrandLogo variant="footer" fade />
          </div>
        </div>
      </div>
    </footer>
  );
}
