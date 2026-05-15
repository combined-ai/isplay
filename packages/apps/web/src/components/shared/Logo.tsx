type BrandLogoProps = {
  variant?: "nav" | "footer";
  fade?: boolean;
};

const MARK_PATH =
  "M40.1123 31.998C40.089 31.9593 31.5176 17.7498 21.0029 17.3047L20.5 17.2939C9.77031 17.2943 0.933033 31.9229 0.887695 31.998V0C0.935283 0.0788915 9.77169 14.7038 20.5 14.7041L21.0029 14.6934C31.5037 14.2489 40.0665 0.0760116 40.1123 0V31.998Z";

const FOOTER_MARK_BOTTOM_PATH =
  "M118.262 98.3598C118.262 98.3598 91.5649 53.3781 59.1322 53.3757V53.3764C26.7103 53.3765 0.0196959 98.3273 0 98.3605V49.4154H59.1294V49.4148H118.262V98.3598Z";

const FOOTER_MARK_TOP_PATH =
  "M118.262 49.4134H0V0.468337C0 0.468337 26.6976 45.4507 59.1308 45.4521C91.5641 45.4509 118.262 0.468337 118.262 0.468337V49.4134Z";

const FOOTER_TEXT_GLYPHS = [
  {
    x: 0,
    path: "M60 0H136V520H60ZM60 619H135V720H60Z",
  },
  {
    x: 196,
    path: "M246 -12C362 -12 452 42 452 143C452 227 411 271 259 297C145 317 117 335 117 387C117 439 168 467 232 467C309 467 363 440 367 360H442C440 469 363 532 232 532C121 532 42 475 42 386C42 304 82 254 239 228C358 209 376 187 376 138C376 83 325 54 246 54C158 54 109 87 102 170H26C32 47 120 -12 246 -12Z",
  },
  {
    x: 674,
    path: "M62 520V-200H137V81C174 23 233 -12 313 -12C468 -12 553 105 553 260C553 415 468 532 313 532C231 532 171 495 134 434V520ZM305 464C418 464 474 377 474 260C474 143 418 56 305 56C191 56 135 143 135 260C135 377 191 464 305 464Z",
  },
  {
    x: 1266,
    path: "M62 720V119C62 41 90 0 181 0H263V66H194C152 66 137 86 137 127V720Z",
  },
  {
    x: 1556,
    path: "M389 0H459V382C459 474 397 532 265 532C155 532 53 484 50 360H125C129 443 199 465 265 465C342 465 386 441 386 375V334L219 301C100 278 31 231 31 140C31 44 100 -12 216 -12C281 -12 344 10 389 73ZM219 55C142 55 109 91 109 142C109 203 155 221 229 237L386 270V210C386 102 302 55 219 55Z",
  },
  {
    x: 2062,
    path: "M28 -200H132C208 -200 230 -151 254 -88L487 520H405L248 91L92 520H10L209 1L183 -69C166 -114 154 -134 105 -134H28Z",
  },
] as const;

const FOOTER_TEXT_TRACKING = -49;

function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 41 32" fill="none" aria-hidden="true" focusable="false">
      <path d={MARK_PATH} fill="currentColor" />
    </svg>
  );
}

function FooterLogoPaths({ fillId, withText = true }: { fillId: string; withText?: boolean }) {
  const fill = `url(#${fillId})`;

  return (
    <g style={{ mixBlendMode: "color-burn" }}>
      <path d={FOOTER_MARK_BOTTOM_PATH} fill={fill} />
      <path d={FOOTER_MARK_TOP_PATH} fill={fill} />
      {withText ? (
        <g transform="translate(154 98.36)">
          <g transform="scale(0.132 -0.132)">
            {FOOTER_TEXT_GLYPHS.map((glyph, index) => (
              <path
                key={glyph.x}
                d={glyph.path}
                transform={`translate(${glyph.x + index * FOOTER_TEXT_TRACKING} 0)`}
                fill={fill}
              />
            ))}
          </g>
        </g>
      ) : null}
    </g>
  );
}

function FooterLogoGradient({
  id,
  x2 = 172.965,
  y2 = 98.3606,
  endOpacity = 0,
}: {
  id: string;
  x2?: number;
  y2?: number;
  endOpacity?: number;
}) {
  return (
    <defs>
      <linearGradient id={id} x1="172.965" y1="0" x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
        <stop stopColor="#010101" />
        <stop offset="1" stopColor="#010101" stopOpacity={endOpacity} />
      </linearGradient>
    </defs>
  );
}

export function BrandLogo({ variant = "nav", fade = false }: BrandLogoProps) {
  if (variant === "footer") {
    return (
      <>
        <svg
          data-fade-in={fade ? "opacity" : undefined}
          className="footer_logo-full footer_logo-svg"
          viewBox="-8 -4 505 138"
          fill="none"
          role="img"
          aria-label="isplay logotype"
        >
          <FooterLogoPaths fillId="footer-logo-fill" />
          <FooterLogoGradient id="footer-logo-fill" y2={130} endOpacity={0.35} />
        </svg>
        <svg
          data-fade-in={fade ? "opacity" : undefined}
          className="footer_logo footer_logo-svg"
          viewBox="0 0 118.262 100"
          fill="none"
          role="img"
          aria-label="isplay symbol"
        >
          <FooterLogoPaths fillId="footer-logo-mobile-fill" withText={false} />
          <FooterLogoGradient id="footer-logo-mobile-fill" x2={59.131} />
        </svg>
      </>
    );
  }

  return (
    <span data-fade-in={fade ? "opacity" : undefined} className={`brand-logo brand-logo--${variant}`} aria-label="isplay logotype">
      <LogoMark className="brand-logo__mark" />
      <span className="brand-logo__text" aria-hidden="true">
        <span className="brand-logo__letter brand-logo__letter--i">i</span>
        <span className="brand-logo__letter brand-logo__letter--s">s</span>
        <span className="brand-logo__letter brand-logo__letter--p">p</span>
        <span className="brand-logo__letter brand-logo__letter--l">l</span>
        <span className="brand-logo__letter brand-logo__letter--a">a</span>
        <span className="brand-logo__letter brand-logo__letter--y">y</span>
      </span>
    </span>
  );
}
