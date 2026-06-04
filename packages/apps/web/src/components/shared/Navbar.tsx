import { BrandLogo } from "./Logo";
import { ButtonIcon } from "./Primitives";

export function Navbar() {
  return (
    <div
      data-animation="default"
      className="navbar_component w-nav"
      data-easing2="ease"
      fs-scrolldisable-element="smart-nav"
      data-easing="ease"
      data-collapse="none"
      data-w-id="18438a5b-c792-2cfd-4aa8-f631626edd81"
      role="banner"
      data-duration="400"
    >
      <div className="navbar_container">
        <a href="/" aria-current="page" aria-label="isplay home" className="navbar_logo-link w-nav-brand w--current">
          <BrandLogo />
        </a>
        <div className="navbar_menu-group">
          <div className="navbar_menu-links">
            <a shuffle="true" href="/docs" className="navbar_link w-inline-block">
              <div shuffle="el" className="t-label-3-rg">
                Docs
              </div>
            </a>
          </div>
          <ButtonIcon label="Install" href="/docs/install" variant="navbar" eventName="Install-navigation" />
        </div>
      </div>
    </div>
  );
}
