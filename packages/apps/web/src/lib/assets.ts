const SITE = "/mirror/cdn.prod.website-files.com/691621fbb0674afe0d3eb98c";
const WEBFLOW_MEDIA = "/mirror/s3.amazonaws.com/webflow-prod-assets/691621fbb0674afe0d3eb98c";

export const assets = {
  logoIcon: `${SITE}/69176dd905112c0630a72135_logo-icon.svg`,
  favicon: `${SITE}/691db47936f81c2558d8cbcb_Favicon-32.png`,
  appleTouchIcon: `${SITE}/691db47e00ea160dbf175481_Favicon-256.png`,
  ogImage: `${SITE}/69204ecf79818c569b465b6c_OG-image.png`,
  corner: `${SITE}/691b500c8dd098bcb386ca6b_corner.svg`,
  plus: `${SITE}/691cd6a8afd8d44dc494ffde_plus.svg`,
  lotties: {
    evaluation: `${SITE}/691f133e84ace07156d7ed10_evaluation-icon.json`,
    verifiers: `${SITE}/691f07b2e9b56779270c0d2a_Verifiers-icon.lottie`,
    reasoning: `${SITE}/69204a8ca04a24ee366d98c0_Lines.json`,
    foundation: `${SITE}/691f3d0588c37461a2b9d7c7_Foundation-icon_opt.lottie`,
    security: `${SITE}/69204a8c7770671974faa05e_SnP.json`,
  },
  videos: {
    particle: `${WEBFLOW_MEDIA}/692061d98a8ff6803e8fd392_particle-last-min.mp4`,
    wave: `${WEBFLOW_MEDIA}/692075d5b9c838523cf12b7b_wave-last-min.mp4`,
    particlePoster: `${SITE}/691f5d0a5fa3168cb9c6fd57_poster-particle.webp`,
    wavePoster: `${SITE}/691f5d07ec4499cd79b54b8f_post-wave.webp`,
  },
  scripts: {
    jquery: "/mirror/d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8__q_f0cb7082.js",
    gsap: "/mirror/cdn.prod.website-files.com/gsap/3.15.0/gsap.min.js",
    scrollTrigger: "/mirror/cdn.prod.website-files.com/gsap/3.15.0/ScrollTrigger.min.js",
    splitText: "/mirror/cdn.prod.website-files.com/gsap/3.15.0/SplitText.min.js",
    webflow: `${SITE}/js/webflow.eb6b08da.9517c9fc8026470a.js`,
  },
};
